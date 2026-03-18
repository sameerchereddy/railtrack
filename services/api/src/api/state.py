"""API-side state: stores the latest map snapshot received from the Feed via IPC."""
import asyncio
import json
import logging

logger = logging.getLogger(__name__)


class AppState:
    """Holds the most recent map_update payload from the Feed service.

    Updated by the IPC reader task whenever the feed publishes a new
    map snapshot.  REST endpoints serve the cached snapshot; the WS
    endpoint broadcasts it directly to connected clients.
    """

    def __init__(self) -> None:
        self._lock: asyncio.Lock = asyncio.Lock()
        self._map_trains: list[dict] = []
        self._map_meta: dict = {
            'total': 0,
            'mappable': 0,
            'late': 0,
            'on_time': 0,
            'early': 0,
            'cancelled': 0,
            'events_per_minute': 0.0,
            'connected': False,
            'coords_loaded': 0,
        }
        self.ipc_connected: bool = False

    async def apply_ipc_message(self, msg: dict) -> None:
        """Update cached state from an incoming IPC message."""
        if msg.get('type') == 'map_update':
            async with self._lock:
                self._map_trains = msg.get('trains', [])
                meta = msg.get('meta')
                if meta:
                    self._map_meta = meta

    async def get_map_trains(self) -> list[dict]:
        async with self._lock:
            return list(self._map_trains)

    async def get_map_meta(self) -> dict:
        async with self._lock:
            return dict(self._map_meta)


async def ipc_reader_task(
    socket_path: str,
    app_state: AppState,
    ws_manager: 'ConnectionManager',  # type: ignore[name-defined]
) -> None:
    """Connect to Feed service IPC socket and stream map_update messages.

    Reconnects with exponential backoff (1 s → 2 s → 4 s … capped at 30 s).
    """
    backoff = 1.0

    while True:
        reader: asyncio.StreamReader | None = None
        writer: asyncio.StreamWriter | None = None
        try:
            logger.info("IPC: connecting to %s", socket_path)
            reader, writer = await asyncio.open_unix_connection(
                socket_path,
                limit=10 * 1024 * 1024,
            )
            app_state.ipc_connected = True
            backoff = 1.0
            logger.info("IPC: connected")

            while True:
                line = await reader.readline()
                if not line:
                    logger.warning("IPC: connection closed by feed service")
                    break
                try:
                    msg = json.loads(line.decode())
                except Exception as exc:
                    logger.warning("IPC: JSON decode error: %s", exc)
                    continue

                await app_state.apply_ipc_message(msg)

                if msg.get('type') == 'map_update':
                    await ws_manager.broadcast('map', {
                        'type': 'map_update',
                        'trains': msg.get('trains', []),
                        'meta': msg.get('meta', {}),
                    })

        except FileNotFoundError:
            logger.warning("IPC: socket not found at %s — feed not ready yet", socket_path)
        except ConnectionRefusedError:
            logger.warning("IPC: connection refused — feed not ready yet")
        except Exception as exc:
            logger.error("IPC: connection error: %s", exc)
        finally:
            app_state.ipc_connected = False
            if writer:
                try:
                    writer.close()
                    await writer.wait_closed()
                except Exception:
                    pass

        logger.info("IPC: reconnecting in %.0f s", backoff)
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 30.0)
