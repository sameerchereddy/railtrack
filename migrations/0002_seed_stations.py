"""Seed station reference data from stanox-code.csv into the stations collection.

Each document:
    {
        "_id": "<STANOX>",        # e.g. "73000"
        "name": "London Waterloo",
        "crs": "WAT",             # empty string if no CRS
        "route": "...",
        "lat": null,              # filled by migration 0003
        "lng": null,
    }
"""
import csv
import logging
import os
from pathlib import Path

from pymongo.database import Database

logger = logging.getLogger(__name__)
DESCRIPTION = "Seed stations collection from stanox-code.csv"


def _csv_path() -> Path:
    shared = os.environ.get("SHARED_PATH", "./shared")
    return Path(shared) / "stanox-code.csv"


def up(db: Database) -> None:
    """Apply: load stanox-code.csv into stations collection (upsert)."""
    csv_file = _csv_path()
    if not csv_file.exists():
        raise FileNotFoundError(f"stanox-code.csv not found at {csv_file}")

    ops = []
    from pymongo import UpdateOne

    with csv_file.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            stanox = row.get("STANOX NO.", "").strip()
            if not stanox:
                continue
            ops.append(UpdateOne(
                {"_id": stanox},
                {"$setOnInsert": {
                    "_id": stanox,
                    "name": row.get("FULL NAME", "").strip().title(),
                    "crs": row.get("CRS CODE", "").strip().upper(),
                    "route": row.get("Route Description", "").strip(),
                    "lat": None,
                    "lng": None,
                }},
                upsert=True,
            ))

    if ops:
        result = db.stations.bulk_write(ops, ordered=False)
        logger.info("Stations seeded: %d upserted", result.upserted_count)

    db.stations.create_index("crs", name="idx_crs", sparse=True)
    db.stations.create_index([("name", "text")], name="idx_name_text")


def down(db: Database) -> None:
    """Rollback: drop the stations collection entirely."""
    db.stations.drop()
