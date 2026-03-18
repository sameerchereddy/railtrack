"""Entry point for the Network Rail Feed service.

Startup sequence:
1. Configure logging
2. Load settings
3. Connect to MongoDB
4. Load reference data (stanox CSV, coords cache, CORPUS lookup)
5. Rebuild in-memory train states from the last 6 h of DB events
6. Start the IPC publisher (Unix socket server)
7. Start the background train-trim thread
8. Enter the STOMP connection loop (blocking)
"""
import csv as _csv
import json
import logging
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient
from pymongo.database import Database

from feed.config import settings
from feed.database import get_client, get_db, load_recent_events
from feed.ipc import IpcPublisher
from feed.processor import update_train_from_event
from feed.state import AppState
from feed.stomp_client import StompFeedClient

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Reference data loaders
# ---------------------------------------------------------------------------

def load_stanox_csv(shared_path: str) -> dict[str, dict]:
    """Read stanox-code.csv and return a stanox → {name, crs, route} mapping.

    Args:
        shared_path: Directory that contains stanox-code.csv.

    Returns:
        Dict mapping STANOX string → dict with keys 'name', 'crs', 'route'.
    """
    stanox_crs_map: dict[str, dict] = {}
    csv_path = Path(shared_path) / 'stanox-code.csv'
    if not csv_path.exists():
        logger.warning("stanox-code.csv not found at %s", csv_path)
        return stanox_crs_map
    with csv_path.open(newline='', encoding='utf-8-sig') as f:
        for row in _csv.DictReader(f, delimiter='\t'):
            stanox = row.get('STANOX NO.', '').strip()
            if stanox:
                stanox_crs_map[stanox] = {
                    'name': row.get('FULL NAME', '').strip().title(),
                    'crs': row.get('CRS CODE', '').strip().upper(),
                    'route': row.get('Route Description', '').strip(),
                }
    logger.info(
        "stanox CSV: loaded %d entries (%d with CRS)",
        len(stanox_crs_map),
        sum(1 for v in stanox_crs_map.values() if v['crs']),
    )
    return stanox_crs_map


def load_station_coords(shared_path: str) -> dict[str, dict]:
    """Load station_coords.json from the shared directory.

    Args:
        shared_path: Directory that contains station_coords.json.

    Returns:
        Dict mapping STANOX string → {lat, lng, name, crs, route}, or empty
        dict if the file is absent or unreadable.
    """
    coords_path = Path(shared_path) / 'station_coords.json'
    if not coords_path.exists():
        logger.warning("station_coords.json not found at %s", coords_path)
        return {}
    try:
        with coords_path.open() as f:
            data = json.load(f)
        logger.info("Station coords: loaded %d from cache", len(data))
        return data
    except Exception as exc:
        logger.warning("Coords cache unreadable: %s", exc)
        return {}


def load_stanox_lookup(shared_path: str) -> dict[str, str]:
    """Load stanox_lookup.json (CORPUS cache) from the shared directory.

    Args:
        shared_path: Directory that contains stanox_lookup.json.

    Returns:
        Dict mapping STANOX string → station name, or empty dict if absent.
    """
    lookup_path = Path(shared_path) / 'stanox_lookup.json'
    if not lookup_path.exists():
        logger.info("stanox_lookup.json not found — CORPUS names unavailable")
        return {}
    try:
        with lookup_path.open() as f:
            data = json.load(f)
        logger.info("STANOX lookup: loaded %d entries from cache", len(data))
        return data
    except Exception as exc:
        logger.warning("STANOX lookup cache unreadable: %s", exc)
        return {}


# ---------------------------------------------------------------------------
# MongoDB-seeding helpers
# ---------------------------------------------------------------------------


def rebuild_trains_from_db(
    db: Database,
    app_state: AppState,
    stanox_coords: dict,
    stanox_crs_map: dict,
    stanox_lookup: dict,
) -> None:
    """Replay last train_max_age_h hours of MongoDB events to rebuild train states.

    Args:
        db: A pymongo Database handle.
        app_state: The AppState instance to populate.
        stanox_coords: Coords lookup for sname() resolution.
        stanox_crs_map: CSV-based stanox lookup.
        stanox_lookup: CORPUS-based stanox lookup.
    """
    logger.info("Rebuilding train states from MongoDB…")
    rows = load_recent_events(db, settings.train_max_age_h)

    for row in rows:
        try:
            # row['raw'] is already a dict (native BSON), not a JSON string
            received_at = row['received_at'].isoformat() if hasattr(row['received_at'], 'isoformat') else row['received_at']
            update_train_from_event(
                row['raw'], received_at,
                app_state, stanox_coords, stanox_crs_map, stanox_lookup,
                max_journey=settings.max_journey,
            )
        except Exception:
            pass

    with app_state.trains_lock:
        count = len(app_state.active_trains)
    logger.info("Rebuilt %d train states from MongoDB", count)


# ---------------------------------------------------------------------------
# Background loops
# ---------------------------------------------------------------------------

def _iso_to_ts(iso: str) -> float:
    """Convert an ISO-8601 timestamp string to a POSIX float.

    Args:
        iso: ISO-8601 formatted datetime string.

    Returns:
        POSIX timestamp as float, or 0.0 on parse failure.
    """
    try:
        return datetime.fromisoformat(iso.replace('Z', '+00:00')).timestamp()
    except Exception:
        return 0.0


def trim_old_trains_loop(app_state: AppState) -> None:
    """Background loop that evicts trains not updated in train_max_age_h hours.

    Runs forever with a 300-second sleep between passes.

    Args:
        app_state: The AppState instance holding active_trains.
    """
    while True:
        time.sleep(300)
        cutoff = datetime.now(timezone.utc).timestamp() - settings.train_max_age_h * 3600
        with app_state.trains_lock:
            stale = [
                tid for tid, t in app_state.active_trains.items()
                if _iso_to_ts(t.last_event_at) < cutoff
            ]
            for tid in stale:
                del app_state.active_trains[tid]
        if stale:
            logger.info("Evicted %d stale trains", len(stale))


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """Configure and start the Feed service."""
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format='%(asctime)s [%(levelname)s] %(name)s — %(message)s',
        stream=sys.stdout,
    )
    logger.info("Feed service starting up")

    # Connect to MongoDB
    mongo_client = get_client(settings.mongo_uri)
    db = get_db(mongo_client, settings.mongo_db)

    # Load reference data
    stanox_crs_map = load_stanox_csv(settings.shared_path)
    stanox_coords = load_station_coords(settings.shared_path)
    stanox_lookup = load_stanox_lookup(settings.shared_path)

    # Initialise shared state
    app_state = AppState()

    # Rebuild train states from recent MongoDB events
    rebuild_trains_from_db(db, app_state, stanox_coords, stanox_crs_map, stanox_lookup)

    # Start IPC publisher
    ipc_publisher = IpcPublisher(settings.ipc_socket)
    ipc_publisher.start()

    # Start background train-trim thread
    trim_thread = threading.Thread(
        target=trim_old_trains_loop,
        args=(app_state,),
        daemon=True,
        name='trim',
    )
    trim_thread.start()

    # Start STOMP client (blocking — runs in main thread)
    client = StompFeedClient(
        app_state=app_state,
        ipc_publisher=ipc_publisher,
        stanox_coords=stanox_coords,
        stanox_crs_map=stanox_crs_map,
        stanox_lookup=stanox_lookup,
        db=db,
    )
    client.start()


if __name__ == '__main__':
    main()
