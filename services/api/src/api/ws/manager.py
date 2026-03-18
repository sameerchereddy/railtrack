"""WebSocket connection manager for the API service.

Manages pools of connected WebSocket clients grouped by topic and provides
per-connection train-detail subscriptions.
"""
import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections per topic and per-train detail subscriptions.

    Topics are arbitrary string keys (e.g. 'events', 'trains', 'map').
    Each WebSocket may additionally subscribe to a single train detail stream.
    """

    def __init__(self) -> None:
        """Initialise empty connection pools."""
        # topic → set of connected WebSockets
        self._connections: dict[str, set[WebSocket]] = {}
        self._lock: asyncio.Lock = asyncio.Lock()
        # ws → train_id for detail subscriptions
        self._detail_subs: dict[WebSocket, str] = {}

    async def connect(self, ws: WebSocket, topic: str) -> None:
        """Accept and register a WebSocket connection under the given topic.

        Args:
            ws: The FastAPI WebSocket to register.
            topic: The topic name ('events', 'trains', 'map', etc.).
        """
        await ws.accept()
        async with self._lock:
            self._connections.setdefault(topic, set()).add(ws)
        logger.debug("WS: client connected to topic=%s (total=%d)", topic, len(self._connections[topic]))

    async def disconnect(self, ws: WebSocket, topic: str) -> None:
        """Remove a WebSocket connection from the given topic.

        Also removes any detail subscription for this connection.

        Args:
            ws: The WebSocket to remove.
            topic: The topic this connection was registered under.
        """
        async with self._lock:
            topic_set = self._connections.get(topic, set())
            topic_set.discard(ws)
            self._detail_subs.pop(ws, None)
        logger.debug("WS: client disconnected from topic=%s", topic)

    async def broadcast(self, topic: str, message: dict) -> None:
        """Send *message* to every client connected to *topic*.

        Disconnected clients are silently removed from the pool.

        Args:
            topic: The topic to broadcast to.
            message: Python dict to serialise and send as JSON.
        """
        async with self._lock:
            clients = set(self._connections.get(topic, set()))

        dead: list[WebSocket] = []
        for ws in clients:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                topic_set = self._connections.get(topic, set())
                for ws in dead:
                    topic_set.discard(ws)
                    self._detail_subs.pop(ws, None)
            logger.debug("WS: removed %d dead connection(s) from topic=%s", len(dead), topic)

    async def send_to(self, ws: WebSocket, message: dict) -> None:
        """Send *message* to a specific WebSocket client.

        Args:
            ws: The target WebSocket.
            message: Python dict to serialise and send as JSON.

        Raises:
            Exception: Re-raises any send errors to the caller.
        """
        await ws.send_json(message)

    def subscribe_detail(self, ws: WebSocket, train_id: str) -> None:
        """Register a WebSocket as interested in detail updates for *train_id*.

        Each WebSocket can subscribe to at most one train detail at a time.
        Calling this again replaces any existing subscription.

        Args:
            ws: The WebSocket to register.
            train_id: The train identifier to subscribe to.
        """
        self._detail_subs[ws] = train_id
        logger.debug("WS: detail subscription for train_id=%s", train_id)

    def unsubscribe_detail(self, ws: WebSocket) -> None:
        """Remove any detail subscription for *ws*.

        Args:
            ws: The WebSocket to unsubscribe.
        """
        self._detail_subs.pop(ws, None)

    async def broadcast_detail_update(self, train_detail: dict) -> None:
        """Send a train detail update only to clients subscribed to that train.

        Args:
            train_detail: Full train detail dict including 'train_id' key.
        """
        train_id = train_detail.get('train_id')
        if not train_id:
            return

        targets = [ws for ws, tid in self._detail_subs.items() if tid == train_id]
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_json({'type': 'train_detail_update', 'payload': train_detail})
            except Exception:
                dead.append(ws)

        if dead:
            for ws in dead:
                self._detail_subs.pop(ws, None)
