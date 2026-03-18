"""Merge station_coords.json lat/lng into existing stations documents.

Requires migration 0002 (stations collection) to have been applied first.
"""
import json
import logging
import os
from pathlib import Path

from pymongo import UpdateOne
from pymongo.database import Database

logger = logging.getLogger(__name__)
DESCRIPTION = "Merge station coordinates into stations collection"


def _coords_path() -> Path:
    shared = os.environ.get("SHARED_PATH", "./shared")
    return Path(shared) / "station_coords.json"


def up(db: Database) -> None:
    """Apply: update lat/lng on stations that have Overpass coordinates."""
    coords_file = _coords_path()
    if not coords_file.exists():
        logger.warning("station_coords.json not found at %s — skipping", coords_file)
        return

    with coords_file.open() as f:
        coords: dict = json.load(f)

    ops = [
        UpdateOne(
            {"_id": stanox},
            {"$set": {"lat": data["lat"], "lng": data["lng"]}},
        )
        for stanox, data in coords.items()
        if data.get("lat") and data.get("lng")
    ]

    if ops:
        result = db.stations.bulk_write(ops, ordered=False)
        logger.info("Coordinates merged: %d stations updated", result.modified_count)


def down(db: Database) -> None:
    """Rollback: null out lat/lng on all stations."""
    db.stations.update_many({}, {"$set": {"lat": None, "lng": None}})
