"""Migration runner for RailTrack.

Usage:
    python -m migrations.runner up        # apply all pending migrations
    python -m migrations.runner down      # rollback last applied migration
    python -m migrations.runner status    # show applied/pending migrations
    python -m migrations.runner up --to 0002   # apply up to specific migration
"""
import argparse
import importlib
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient
from pymongo.database import Database

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent
MIGRATION_COLLECTION = "migrations"


def _get_db(mongo_uri: str, db_name: str) -> Database:
    client = MongoClient(mongo_uri)
    return client[db_name]


def _discover_migrations() -> list[tuple[str, str]]:
    """Return sorted list of (migration_id, module_name) tuples."""
    files = sorted(
        p for p in MIGRATIONS_DIR.glob("[0-9][0-9][0-9][0-9]_*.py")
        if p.name != "__init__.py"
    )
    return [(f.stem[:4], f"migrations.{f.stem}") for f in files]


def _applied(db: Database) -> set[str]:
    return {doc["_id"] for doc in db[MIGRATION_COLLECTION].find({}, {"_id": 1})}


def cmd_status(db: Database) -> None:
    migrations = _discover_migrations()
    applied = _applied(db)
    print(f"\n{'ID':<8} {'Status':<12} Name")
    print("-" * 50)
    for mid, module_name in migrations:
        name = module_name.split(".")[-1]
        status = "applied" if mid in applied else "pending"
        mark = "✓" if mid in applied else "·"
        print(f"  {mark}  {mid:<8} {status:<12} {name}")
    print()


def cmd_up(db: Database, target: str | None = None) -> None:
    migrations = _discover_migrations()
    applied = _applied(db)
    pending = [
        (mid, mod) for mid, mod in migrations
        if mid not in applied and (target is None or mid <= target)
    ]
    if not pending:
        print("Nothing to apply.")
        return
    for mid, module_name in pending:
        mod = importlib.import_module(module_name)
        print(f"Applying {mid}: {module_name.split('.')[-1]} …", end=" ", flush=True)
        try:
            mod.up(db)
            db[MIGRATION_COLLECTION].insert_one({
                "_id": mid,
                "name": module_name.split(".")[-1],
                "applied_at": datetime.now(timezone.utc),
            })
            print("done")
        except Exception as exc:
            print(f"FAILED: {exc}")
            sys.exit(1)


def cmd_down(db: Database) -> None:
    applied = sorted(_applied(db), reverse=True)
    if not applied:
        print("Nothing to rollback.")
        return
    last = applied[0]
    migrations = {mid: mod for mid, mod in _discover_migrations()}
    module_name = migrations.get(last)
    if not module_name:
        print(f"Migration module for {last} not found.")
        sys.exit(1)
    mod = importlib.import_module(module_name)
    print(f"Rolling back {last}: {module_name.split('.')[-1]} …", end=" ", flush=True)
    try:
        mod.down(db)
        db[MIGRATION_COLLECTION].delete_one({"_id": last})
        print("done")
    except Exception as exc:
        print(f"FAILED: {exc}")
        sys.exit(1)


def main() -> None:
    logging.basicConfig(level=logging.WARNING)
    parser = argparse.ArgumentParser(description="RailTrack migration runner")
    parser.add_argument("command", choices=["up", "down", "status"])
    parser.add_argument("--uri", default="mongodb://localhost:27017", help="MongoDB URI")
    parser.add_argument("--db", default="railtrack", help="Database name")
    parser.add_argument("--to", dest="target", default=None, help="Apply up to this migration ID")
    args = parser.parse_args()

    db = _get_db(args.uri, args.db)
    if args.command == "up":
        cmd_up(db, args.target)
    elif args.command == "down":
        cmd_down(db)
    elif args.command == "status":
        cmd_status(db)


if __name__ == "__main__":
    main()
