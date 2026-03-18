"""Async MongoDB helpers for the API service (motor driver)."""
import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from api.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    """Return the module-level Motor client, creating it if needed."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    """Return the configured Motor database."""
    return get_client()[settings.mongo_db]


def doc_to_event(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a MongoDB event document to a JSON-serialisable API response dict.

    Args:
        doc: Raw MongoDB document from the events collection.

    Returns:
        Dict suitable for JSON serialisation in API responses.
    """
    return {
        "id": str(doc["_id"]),
        "received_at": doc["received_at"].isoformat() if hasattr(doc.get("received_at"), "isoformat") else doc.get("received_at", ""),
        "msg_type": doc.get("msg_type", ""),
        "type_label": doc.get("type_label", ""),
        "train_id": doc.get("train_id", ""),
        "event_type": doc.get("event_type", ""),
        "variation": doc.get("variation", ""),
        "toc_id": doc.get("toc_id", ""),
        "loc_stanox": doc.get("loc_stanox", ""),
        "platform": doc.get("platform", ""),
        "raw": doc.get("raw", {}),
    }
