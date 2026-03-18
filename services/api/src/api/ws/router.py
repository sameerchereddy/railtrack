"""WebSocket route handlers for the API service.

Single endpoint:
- /ws/map  — live map updates with initial snapshot
"""
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


def create_ws_router(app_state, ws_manager, ref_data) -> APIRouter:
    """Create and return the WebSocket APIRouter with injected dependencies."""
    ws_router = APIRouter()

    @ws_router.websocket("/ws/map")
    async def ws_map(websocket: WebSocket) -> None:
        """WebSocket endpoint for the live map update stream.

        On connect: sends the current cached map snapshot as an init message.
        Subsequently receives broadcasted map_update messages from the IPC
        reader task whenever the feed publishes a new snapshot.
        """
        await ws_manager.connect(websocket, 'map')
        try:
            # Send the most recent cached snapshot immediately on connect
            trains = await app_state.get_map_trains()
            meta = await app_state.get_map_meta()
            await ws_manager.send_to(websocket, {
                'type': 'map_update',
                'trains': trains,
                'meta': meta,
            })

            # Keep connection alive; broadcasts come from ipc_reader_task
            while True:
                try:
                    await websocket.receive_text()
                except WebSocketDisconnect:
                    break
        except WebSocketDisconnect:
            pass
        except Exception as exc:
            logger.error("WS /ws/map error: %s", exc)
        finally:
            await ws_manager.disconnect(websocket, 'map')

    return ws_router
