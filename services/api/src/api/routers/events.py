"""Events router — GET /api/events and GET /api/events/history."""
import logging
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.database import doc_to_event, get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/events")
async def list_events(
    since: str = Query(default="", description="Last seen event _id (ObjectId hex); returns events after this"),
    limit: int = Query(default=100, le=500, ge=1),
    type: str = Query(default=""),
    toc: str = Query(default=""),
) -> list[dict]:
    """Return recent events, newest first.

    Args:
        since: ObjectId hex string of last seen event (exclusive lower bound).
        limit: Maximum number of events to return (capped at 500).
        type: Filter by type_label (e.g. 'Movement').
        toc: Filter by toc_id.

    Returns:
        List of event dicts, newest first.
    """
    db: AsyncIOMotorDatabase = get_db()
    query: dict = {}

    if since:
        try:
            query["_id"] = {"$gt": ObjectId(since)}
        except InvalidId:
            pass

    if type:
        query["type_label"] = type
    if toc:
        query["toc_id"] = toc

    cursor = db.events.find(query).sort("_id", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [doc_to_event(d) for d in docs]


@router.get("/events/history")
async def events_history() -> list[dict]:
    """Return per-minute event counts for the last hour.

    Returns:
        List of {minute: ISO string, cnt: int} dicts, ordered chronologically.
    """
    db: AsyncIOMotorDatabase = get_db()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)

    pipeline = [
        {"$match": {"received_at": {"$gte": cutoff}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%dT%H:%M:00Z",
                        "date": "$received_at",
                    }
                },
                "cnt": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
        {"$project": {"minute": "$_id", "cnt": 1, "_id": 0}},
    ]

    results = await db.events.aggregate(pipeline).to_list(length=None)
    return results
