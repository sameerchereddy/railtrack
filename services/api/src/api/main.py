"""FastAPI application entry point for the API service.

Startup sequence (lifespan):
1. Load reference data (stanox CSV, coords, lookup)
2. Start IPC reader background task
3. Yield (serve requests)
4. Cancel IPC task on shutdown
"""
import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.reference import load_reference_data
from api.routers.map import create_map_router
from api.routers.meta import create_meta_router
from api.routers.trains import create_trains_router
from api.state import AppState, ipc_reader_task
from api.ws.manager import ConnectionManager
from api.ws.router import create_ws_router

logger = logging.getLogger(__name__)

_app_state: AppState | None = None
_ws_manager: ConnectionManager | None = None
_ref_data = None  # ReferenceData


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI lifespan handler: startup and shutdown logic."""
    global _app_state, _ws_manager, _ref_data

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format='%(asctime)s [%(levelname)s] %(name)s — %(message)s',
        stream=sys.stdout,
    )
    logger.info("API service starting up")

    _ref_data = load_reference_data(settings.shared_path)
    _app_state = AppState()
    _ws_manager = ConnectionManager()

    _mount_dynamic_routers(app)

    ipc_task = asyncio.create_task(
        ipc_reader_task(settings.ipc_socket, _app_state, _ws_manager),
        name='ipc-reader',
    )

    logger.info("API service ready")
    yield

    logger.info("API service shutting down")
    ipc_task.cancel()
    try:
        await ipc_task
    except asyncio.CancelledError:
        pass


def _mount_dynamic_routers(app: FastAPI) -> None:
    app.include_router(
        create_trains_router(_ref_data),
        prefix='/api',
        tags=['trains'],
    )
    app.include_router(
        create_map_router(_app_state),
        prefix='/api',
        tags=['map'],
    )
    app.include_router(
        create_meta_router(_app_state),
        prefix='/api',
        tags=['meta'],
    )
    ws_r = create_ws_router(_app_state, _ws_manager, _ref_data)
    app.include_router(ws_r)


app = FastAPI(
    title='RailTrack Live Feed API',
    version='1.0.0',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health', tags=['meta'])
async def health() -> dict:
    connected = _app_state.ipc_connected if _app_state else False
    return {'status': 'ok', 'connected': connected}
