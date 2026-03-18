"""Thread-safe in-memory state for the Feed service."""
import logging
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class TrainState:
    """In-memory representation of a single train's current state."""

    train_id: str
    toc_id: str
    first_seen: str
    last_event_at: str
    last_stanox: str = ''
    next_stanox: str = ''
    variation: str = ''
    timetable_variation: int = 0
    terminated: bool = False
    cancelled: bool = False
    direction: str = ''
    train_uid: str = ''
    origin_stanox: str = ''
    origin_dep_ts: int = 0
    journey: list = field(default_factory=list)


def _make_train(train_id: str, toc_id: str, received_at: str) -> TrainState:
    return TrainState(
        train_id=train_id,
        toc_id=toc_id,
        first_seen=received_at,
        last_event_at=received_at,
    )


class AppState:
    """Central in-memory state store for the Feed service.

    Holds the active train map and minimal connection/rate stats needed
    for the map meta payload.  All mutations are lock-protected.
    """

    def __init__(self) -> None:
        self.trains_lock: threading.Lock = threading.Lock()
        self.active_trains: dict[str, TrainState] = {}

        self._lock: threading.Lock = threading.Lock()
        self._connected: bool = False
        self._event_times: deque = deque(maxlen=1000)

    @property
    def connected(self) -> bool:
        with self._lock:
            return self._connected

    @connected.setter
    def connected(self, val: bool) -> None:
        with self._lock:
            self._connected = val

    def record_event(self) -> None:
        """Record that one event was processed right now."""
        with self._lock:
            self._event_times.append(time.time())

    def events_per_minute(self) -> float:
        """Return the count of events processed in the last 60 seconds."""
        with self._lock:
            cutoff = time.time() - 60
            return round(sum(1 for t in self._event_times if t >= cutoff), 1)
