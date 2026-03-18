"""Meta REST API router.

Endpoints:
- GET /trains/meta/tocs — distinct TOC IDs in active trains
- GET /toc_names        — full TOC ID → operator name mapping
"""
import logging
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Import TOC_NAMES from the shared package (mounted at /shared in Docker).
# In development the shared/ dir is on sys.path or referenced directly.
def _load_toc_names() -> dict[str, str]:
    """Load TOC_NAMES from the shared toc_names module.

    Attempts to import from the 'shared.toc_names' package first.
    Falls back to a direct path import from /shared/toc_names.py.

    Returns:
        TOC_NAMES dict mapping toc_id → operator name.
    """
    try:
        from shared.toc_names import TOC_NAMES  # type: ignore[import]
        return TOC_NAMES
    except ImportError:
        pass
    # Try adding /shared to sys.path
    shared_path = Path('/shared')
    if shared_path.exists() and str(shared_path) not in sys.path:
        sys.path.insert(0, str(shared_path))
    try:
        from toc_names import TOC_NAMES  # type: ignore[import]
        return TOC_NAMES
    except ImportError:
        pass
    # Hard-coded fallback so the endpoint never 500s
    return {
        '05': 'CrossCountry', '06': 'Chiltern Railways', '08': 'Merseyrail',
        '09': 'East Midlands Railway', '19': 'Heathrow Connect',
        '20': 'TransPennine Express', '21': 'Avanti West Coast',
        '22': 'Alliance Rail', '23': 'Transport for Wales', '25': 'Southeastern',
        '27': 'London Northwestern', '28': 'Greater Anglia', '29': 'Thameslink',
        '30': 'Gatwick Express', '33': 'Heathrow Express', '34': 'Lumo',
        '35': 'Grand Central', '39': 'Chiltern Railways', '40': 'CrossCountry',
        '42': 'Southern', '45': 'Gatwick Express', '46': 'Eurostar',
        '49': 'Caledonian Sleeper', '54': 'South Western Railway',
        '56': 'GB Railfreight', '60': 'Great Western Railway', '61': 'ScotRail',
        '64': 'Island Line', '65': 'Northern', '71': 'Network Rail',
        '74': 'DB Cargo UK', '79': 'Freightliner', '80': 'DB Cargo UK',
        '84': 'GB Railfreight', '85': 'Freightliner Heavy Haul',
        '86': 'Direct Rail Services', '88': 'London Overground',
        '91': 'Eurostar', '93': 'GB Railfreight', '97': 'Network Rail (Test)',
    }


TOC_NAMES: dict[str, str] = _load_toc_names()


def create_meta_router(app_state: Any) -> APIRouter:
    """Create the meta router with injected app_state.

    Args:
        app_state: The API service's AppState instance.

    Returns:
        Configured APIRouter with meta endpoints.
    """
    r = APIRouter()

    @r.get("/toc_names", response_model=dict)
    async def get_toc_names() -> dict[str, str]:
        """Return the full TOC ID to operator name mapping.

        Matches server.py's api_toc_names() exactly.

        Returns:
            Dict mapping toc_id string → operator name string.
        """
        return TOC_NAMES

    return r
