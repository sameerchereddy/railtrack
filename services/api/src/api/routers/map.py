"""Map REST API router.

Endpoints:
- GET /map/trains — active trains with coordinates (cached from last IPC map_update)
- GET /map/meta   — summary statistics (cached from last IPC map_update)
"""
import logging
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)


def create_map_router(app_state: Any) -> APIRouter:
    """Create the map router with injected app_state."""
    r = APIRouter()

    @r.get("/map/trains", response_model=list[dict])
    async def get_map_trains() -> list[dict]:
        """Return the cached map train list from the last IPC map_update."""
        return await app_state.get_map_trains()

    @r.get("/map/meta", response_model=dict)
    async def get_map_meta() -> dict:
        """Return the cached map meta from the last IPC map_update."""
        return await app_state.get_map_meta()

    return r
