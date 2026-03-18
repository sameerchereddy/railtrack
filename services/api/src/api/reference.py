"""Read-only reference data loader for the API service.

Loads STANOX CSV, station coordinates, and CORPUS lookup on startup and
exposes them as a FastAPI dependency via a ReferenceData dataclass.
"""
import csv as _csv
import json
import logging
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class ReferenceData:
    """Immutable reference data loaded once at API startup."""

    stanox_coords: dict[str, dict]
    stanox_crs_map: dict[str, dict]
    stanox_lookup: dict[str, str]


def load_stanox_csv(shared_path: str) -> dict[str, dict]:
    """Read stanox-code.csv and return a stanox → {name, crs, route} mapping.

    Args:
        shared_path: Directory containing stanox-code.csv.

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
        shared_path: Directory containing station_coords.json.

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
        shared_path: Directory containing stanox_lookup.json.

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
        logger.info("STANOX lookup: loaded %d entries", len(data))
        return data
    except Exception as exc:
        logger.warning("STANOX lookup cache unreadable: %s", exc)
        return {}


def sname(
    stanox: str,
    stanox_coords: dict[str, dict],
    stanox_crs_map: dict[str, dict],
    stanox_lookup: dict[str, str],
) -> str:
    """Resolve a STANOX code to a human-readable station name.

    Resolution order (matching server.py):
    1. stanox_coords (derived from Overpass + CSV — most authoritative)
    2. stanox_crs_map (from stanox-code.csv)
    3. stanox_lookup  (from CORPUS JSON cache)
    4. Raw stanox code as a final fallback

    Args:
        stanox: The STANOX code to resolve.
        stanox_coords: Coords lookup built from station_coords.json.
        stanox_crs_map: CSV-based stanox lookup.
        stanox_lookup: CORPUS-based stanox lookup.

    Returns:
        A human-readable station name, or the raw stanox string as fallback.
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


def load_reference_data(shared_path: str) -> ReferenceData:
    """Load all reference data and return as a ReferenceData instance.

    Args:
        shared_path: Shared data directory containing reference files.

    Returns:
        Populated ReferenceData dataclass.
    """
    stanox_crs_map = load_stanox_csv(shared_path)
    stanox_coords = load_station_coords(shared_path)
    stanox_lookup = load_stanox_lookup(shared_path)
    return ReferenceData(
        stanox_coords=stanox_coords,
        stanox_crs_map=stanox_crs_map,
        stanox_lookup=stanox_lookup,
    )
