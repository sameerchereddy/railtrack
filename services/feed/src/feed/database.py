"""MongoDB database helpers for the Feed service (synchronous pymongo)."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

logger = logging.getLogger(__name__)

MSG_TYPES: dict[str, str] = {
    "0001": "Activation",
    "0002": "Cancellation",
    "0003": "Movement",
    "0005": "Reinstatement",
    "0006": "Change of Origin",
    "0007": "Change of Identity",
    "0008": "Change of Location",
}


def get_client(mongo_uri: str) -> MongoClient:
    """Create and return a MongoClient.

    Args:
        mongo_uri: MongoDB connection URI.

    Returns:
        A connected MongoClient instance.
    """
    client: MongoClient = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    # Ping to verify connection
    client.admin.command("ping")
    logger.info("MongoDB connected: %s", mongo_uri)
    return client


def get_db(client: MongoClient, db_name: str) -> Database:
    """Return a database handle.

    Args:
        client: An active MongoClient.
        db_name: Name of the database to use.

    Returns:
        The requested Database instance.
    """
    return client[db_name]


def save_event(
    collection: Collection,
    ev: dict[str, Any],
    received_at: datetime,
) -> str:
    """Persist a single NR event to MongoDB.

    Stores the original event dict as native BSON (not a JSON string).

    Args:
        collection: The MongoDB events collection.
        ev: Parsed NR event dict with 'header' and 'body' keys.
        received_at: Timestamp when the STOMP frame was received.

    Returns:
        The inserted document _id as a hex string.
    """
    header = ev.get("header", {})
    body = ev.get("body", {})
    msg_type = header.get("msg_type", "")
    type_label = MSG_TYPES.get(msg_type, f"Unknown ({msg_type})")
    train_id = (body.get("train_id") or body.get("current_train_id", "")).strip()

    doc = {
        "received_at": received_at,
        "msg_type": msg_type,
        "type_label": type_label,
        "train_id": train_id,
        "event_type": body.get("event_type", ""),
        "variation": body.get("variation_status", "").strip(),
        "toc_id": body.get("toc_id", "").strip(),
        "loc_stanox": body.get("loc_stanox", ""),
        "platform": body.get("platform", "").strip(),
        "raw": ev,  # Native BSON — no JSON serialisation needed
    }
    result = collection.insert_one(doc)
    return str(result.inserted_id)


def load_recent_events(
    db: Database,
    max_age_hours: int,
    limit: int = 500,
) -> list[dict[str, Any]]:
    """Fetch recent events for state rebuilding and stats seeding.

    Args:
        db: The MongoDB database handle.
        max_age_hours: How many hours back to look.
        limit: Maximum number of recent events to return.

    Returns:
        List of event documents (oldest first for state replay).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    cursor = (
        db.events
        .find({"received_at": {"$gte": cutoff}})
        .sort("_id", 1)
    )
    return list(cursor)


