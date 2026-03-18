"""Create indexes on the events collection."""
from pymongo.database import Database


DESCRIPTION = "Create indexes on events collection"


def up(db: Database) -> None:
    """Apply: create indexes for events collection query patterns."""
    db.events.create_index("received_at", name="idx_received_at")
    db.events.create_index("train_id", name="idx_train_id")
    db.events.create_index("toc_id", name="idx_toc_id")
    db.events.create_index("msg_type", name="idx_msg_type")
    db.events.create_index(
        [("received_at", -1), ("train_id", 1)],
        name="idx_received_train",
    )


def down(db: Database) -> None:
    """Rollback: drop events indexes (collection kept)."""
    for name in ["idx_received_at", "idx_train_id", "idx_toc_id", "idx_msg_type", "idx_received_train"]:
        try:
            db.events.drop_index(name)
        except Exception:
            pass
