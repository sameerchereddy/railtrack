"""Event processing logic for the Feed service."""
import logging
from datetime import datetime, timezone

from pymongo.collection import Collection

from feed.database import save_event
from feed.state import AppState, _make_train

logger = logging.getLogger(__name__)


def sname(
    stanox: str,
    stanox_coords: dict[str, dict],
    stanox_crs_map: dict[str, dict],
    stanox_lookup: dict[str, str],
) -> str:
    """Resolve a STANOX code to a human-readable station name.

    Resolution order:
    1. stanox_coords (derived from Overpass + CSV — most authoritative)
    2. stanox_crs_map (from stanox-code.csv)
    3. stanox_lookup  (from CORPUS JSON cache)
    4. Raw stanox code as a final fallback
    """
    if not stanox:
        return ''
    c = stanox_coords.get(str(stanox))
    if c and c.get('name'):
        return c['name']
    csv_entry = stanox_crs_map.get(str(stanox))
    if csv_entry and csv_entry.get('name'):
        return csv_entry['name']
    return stanox_lookup.get(str(stanox), stanox)


def update_train_from_event(
    ev: dict,
    received_at: str,
    app_state: AppState,
    stanox_coords: dict[str, dict],
    stanox_crs_map: dict[str, dict],
    stanox_lookup: dict[str, str],
    max_journey: int = 150,
) -> None:
    """Apply a single Network Rail event to the in-memory train state."""
    header = ev.get('header', {})
    body = ev.get('body', {})
    msg_type = header.get('msg_type', '')
    train_id = (body.get('train_id') or body.get('current_train_id', '')).strip()
    if not train_id:
        return

    toc_id = body.get('toc_id', '').strip()

    with app_state.trains_lock:
        if train_id not in app_state.active_trains:
            app_state.active_trains[train_id] = _make_train(train_id, toc_id, received_at)
        t = app_state.active_trains[train_id]
        t.last_event_at = received_at
        if toc_id:
            t.toc_id = toc_id

        if msg_type == '0001':  # Activation
            t.train_uid = body.get('train_uid', '')
            t.origin_stanox = body.get('sched_origin_stanox', '')
            try:
                raw_ts = body.get('origin_dep_timestamp', '')
                t.origin_dep_ts = int(raw_ts) if raw_ts else 0
            except Exception:
                pass

        elif msg_type == '0002':  # Cancellation
            t.cancelled = True
            t.last_stanox = body.get('loc_stanox', t.last_stanox)

        elif msg_type == '0003':  # Movement
            stanox = body.get('loc_stanox', '')
            t.last_stanox = stanox
            t.next_stanox = body.get('next_report_stanox', '')
            t.variation = body.get('variation_status', '').strip()
            t.direction = body.get('direction_ind', '')
            t.terminated = body.get('train_terminated', 'false').lower() == 'true'
            try:
                t.timetable_variation = int(body.get('timetable_variation', 0) or 0)
            except Exception:
                pass

            try:
                planned_ts = int(body.get('planned_timestamp', 0) or 0)
                actual_ts = int(body.get('actual_timestamp', 0) or 0)
            except Exception:
                planned_ts = actual_ts = 0

            try:
                next_run_time = int(body.get('next_report_run_time', 0) or 0)
            except Exception:
                next_run_time = 0

            if len(t.journey) < max_journey:
                t.journey.append({
                    'seq': len(t.journey),
                    'stanox': stanox,
                    'stanox_name': sname(stanox, stanox_coords, stanox_crs_map, stanox_lookup),
                    'event_type': body.get('event_type', ''),
                    'planned_ts': planned_ts,
                    'actual_ts': actual_ts,
                    'variation_status': body.get('variation_status', '').strip(),
                    'timetable_variation': t.timetable_variation,
                    'platform': body.get('platform', '').strip(),
                    'direction': body.get('direction_ind', ''),
                    'next_stanox': body.get('next_report_stanox', ''),
                    'next_run_time': next_run_time,
                })


def process_batch(
    batch: list,
    received_at: datetime,
    collection: Collection,
    app_state: AppState,
    stanox_coords: dict[str, dict],
    stanox_crs_map: dict[str, dict],
    stanox_lookup: dict[str, str],
    max_journey: int = 150,
) -> None:
    """Process one STOMP frame's list of events.

    For each event: saves to MongoDB and updates in-memory train state.
    """
    received_at_iso = received_at.isoformat()

    for ev in batch:
        try:
            save_event(collection, ev, received_at)
            update_train_from_event(
                ev, received_at_iso, app_state,
                stanox_coords, stanox_crs_map, stanox_lookup,
                max_journey=max_journey,
            )
            app_state.record_event()
        except Exception as exc:
            logger.error("Error processing event: %s", exc)
