"""Unix-domain-socket IPC publisher for the Feed service.

The Feed service acts as a SERVER on the Unix socket.  The API service
connects as a client.  All connected clients receive every message that
is published (broadcast model).

Message format: newline-delimited JSON, one message per line.
"""
import json
import logging
import socket
import threading
import time
from pathlib import Path

logger = logging.getLogger(__name__)


class IpcPublisher:
    """Broadcasts newline-delimited JSON messages to all connected API clients.

    Acts as a Unix-domain-socket server.  Multiple API instances can connect
    simultaneously; each receives every published message.  Disconnected
    clients are removed from the broadcast list automatically.
    """

    def __init__(self, socket_path: str) -> None:
        self._socket_path = socket_path
        self._clients: list[socket.socket] = []
        self._clients_lock = threading.Lock()
        self._server_sock: socket.socket | None = None
        self._running = False
        self._last_map_publish: float = 0.0
        self._map_interval: float = 5.0  # seconds between map_update publishes

    def start(self) -> None:
        """Bind the Unix socket and begin accepting client connections."""
        sock_path = Path(self._socket_path)
        if sock_path.exists():
            sock_path.unlink()
        sock_path.parent.mkdir(parents=True, exist_ok=True)

        self._server_sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self._server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_sock.bind(self._socket_path)
        self._server_sock.listen(10)
        self._running = True
        logger.info("IPC publisher listening on %s", self._socket_path)

        t = threading.Thread(target=self._accept_loop, daemon=True, name='ipc-accept')
        t.start()

    def _accept_loop(self) -> None:
        """Accept incoming connections and add them to the broadcast list."""
        while self._running:
            try:
                client_sock, _ = self._server_sock.accept()
                with self._clients_lock:
                    self._clients.append(client_sock)
                logger.debug("IPC: new client connected (%d total)", len(self._clients))
            except Exception as exc:
                if self._running:
                    logger.error("IPC accept error: %s", exc)
                    time.sleep(1)

    def _broadcast(self, message: dict) -> None:
        """Serialise message and send it to every connected client."""
        data = (json.dumps(message) + '\n').encode()
        dead: list[socket.socket] = []

        with self._clients_lock:
            clients_snapshot = list(self._clients)

        for client in clients_snapshot:
            try:
                client.sendall(data)
            except Exception:
                dead.append(client)
                try:
                    client.close()
                except Exception:
                    pass

        if dead:
            with self._clients_lock:
                for d in dead:
                    try:
                        self._clients.remove(d)
                    except ValueError:
                        pass
            logger.debug("IPC: removed %d disconnected client(s)", len(dead))

    def publish_map_update(self, trains: list, meta: dict) -> None:
        """Broadcast a map snapshot if at least map_interval seconds have elapsed.

        Coalesces rapid updates: at most one map_update message every
        _map_interval seconds is sent to avoid flooding the API service.
        """
        now = time.time()
        if now - self._last_map_publish < self._map_interval:
            return
        self._last_map_publish = now
        self._broadcast({
            'type': 'map_update',
            'trains': trains,
            'meta': meta,
        })

    def stop(self) -> None:
        """Stop accepting connections and close the server socket."""
        self._running = False
        if self._server_sock:
            try:
                self._server_sock.close()
            except Exception:
                pass
        sock_path = Path(self._socket_path)
        if sock_path.exists():
            try:
                sock_path.unlink()
            except Exception:
                pass
        logger.info("IPC publisher stopped")
