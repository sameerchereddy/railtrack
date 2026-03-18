"""Stats REST API router.

Endpoints:
- GET /stats — current dashboard statistics
"""
import logging
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)


def create_stats_router(app_state: Any) -> APIRouter:
    """Create the stats router with injected app_state.

    Args:
        app_state: The API service's AppState instance.

    Returns:
        Configured APIRouter with the /stats endpoint.
    """
    r = APIRouter()

    @r.get("/stats", response_model=dict)
    async def get_stats() -> dict:
        """Return current dashboard statistics.

        Matches server.py's api_stats() exactly: returns the full stats dict
        with toc_counts truncated to the top 10 operators by event count.

        Returns:
            Stats dict with keys: total, connected, started_at, last_event_at,
            type_counts, toc_counts (top 10), variation_counts, events_per_minute.
        """
        top_tocs = sorted(
            app_state.stats.get('toc_counts', {}).items(),
            key=lambda x: -x[1],
        )[:10]
        return {**app_state.stats, 'toc_counts': dict(top_tocs)}

    return r
