"""STOMP connection client for the Feed service."""
import json
import logging
import time
from datetime import datetime, timezone

import stomp
from pymongo.database import Database

from feed.config import settings
from feed.ipc import IpcPublisher
from feed.processor import process_batch, sname
from feed.state import AppState

logger = logging.getLogger(__name__)


class FeedListener(stomp.ConnectionListener):
    """STOMP ConnectionListener that processes incoming train movement frames."""

    def __init__(
        self,
        app_state: AppState,
        ipc_publisher: IpcPublisher,
        stanox_coords: dict,
        stanox_crs_map: dict,
        stanox_lookup: dict,
        db: Database,
    ) -> None:
        self._app_state = app_state
        self._ipc = ipc_publisher
        self._stanox_coords = stanox_coords
        self._stanox_crs_map = stanox_crs_map
        self._stanox_lookup = stanox_lookup
        self._db = db

    def on_connected(self, frame: stomp.utils.Frame) -> None:
        logger.info("STOMP connected")
        self._app_state.connected = True

    def on_disconnected(self) -> None:
        logger.warning("STOMP disconnected")
        self._app_state.connected = False

    def on_error(self, frame: stomp.utils.Frame) -> None:
        logger.error("STOMP error: %s", frame.body)

    def on_message(self, frame: stomp.utils.Frame) -> None:
        """Parse and process an incoming STOMP message frame."""
        try:
            batch = json.loads(frame.body)
        except Exception as exc:
            logger.warning("JSON parse error: %s", exc)
            return

        received_at = datetime.now(timezone.utc)

        try:
            process_batch(
                batch, received_at, self._db.events,
                self._app_state,
                self._stanox_coords,
                self._stanox_crs_map,
                self._stanox_lookup,
                max_journey=settings.max_journey,
            )
        except Exception as exc:
            logger.error("DB error during process_batch: %s", exc)
            return

        # Build and (conditionally) publish map update
        map_trains = []
        with self._app_state.trains_lock:
            for t in self._app_state.active_trains.values():
                last_c = self._stanox_coords.get(t.last_stanox)
                if not last_c:
                    continue
                last_stop = t.journey[-1] if t.journey else {}
                next_c = self._stanox_coords.get(t.next_stanox) if t.next_stanox else None
                map_trains.append({
                    'train_id': t.train_id,
                    'toc_id': t.toc_id,
                    'variation': t.variation,
                    'timetable_variation': t.timetable_variation,
                    'terminated': t.terminated,
                    'cancelled': t.cancelled,
                    'stop_count': len(t.journey),
                    'last_event_at': t.last_event_at,
                    'last_stanox': t.last_stanox,
                    'last_stanox_name': last_c.get('name', t.last_stanox),
                    'last_lat': last_c['lat'],
                    'last_lng': last_c['lng'],
                    'next_stanox': t.next_stanox,
                    'next_stanox_name': self._stanox_coords.get(t.next_stanox, {}).get(
                        'name', t.next_stanox
                    ),
                    'next_lat': next_c['lat'] if next_c else None,
                    'next_lng': next_c['lng'] if next_c else None,
                    'last_actual_ts': last_stop.get('actual_ts', 0),
                    'last_event_type': last_stop.get('event_type', ''),
                    'next_run_time': last_stop.get('next_run_time', 0),
                })

            total = len(self._app_state.active_trains)
            mappable = len(map_trains)
            late = sum(1 for t in self._app_state.active_trains.values() if t.variation == 'LATE')
            on_time = sum(1 for t in self._app_state.active_trains.values() if t.variation == 'ON TIME')
            early = sum(1 for t in self._app_state.active_trains.values() if t.variation == 'EARLY')
            cancelled = sum(1 for t in self._app_state.active_trains.values() if t.cancelled)

        meta = {
            'total': total,
            'mappable': mappable,
            'late': late,
            'on_time': on_time,
            'early': early,
            'cancelled': cancelled,
            'events_per_minute': self._app_state.events_per_minute(),
            'connected': self._app_state.connected,
            'coords_loaded': len(self._stanox_coords),
        }
        self._ipc.publish_map_update(map_trains, meta)


class StompFeedClient:
    """Manages the STOMP connection lifecycle for the Feed service."""

    def __init__(
        self,
        app_state: AppState,
        ipc_publisher: IpcPublisher,
        stanox_coords: dict,
        stanox_crs_map: dict,
        stanox_lookup: dict,
        db: Database,
    ) -> None:
        self._app_state = app_state
        self._ipc = ipc_publisher
        self._stanox_coords = stanox_coords
        self._stanox_crs_map = stanox_crs_map
        self._stanox_lookup = stanox_lookup
        self._db = db

    def start(self) -> None:
        """Start the STOMP connection loop (blocking)."""
        listener = FeedListener(
            app_state=self._app_state,
            ipc_publisher=self._ipc,
            stanox_coords=self._stanox_coords,
            stanox_crs_map=self._stanox_crs_map,
            stanox_lookup=self._stanox_lookup,
            db=self._db,
        )

        while True:
            try:
                conn = stomp.Connection(
                    host_and_ports=[(settings.stomp_host, settings.stomp_port)],
                    heartbeats=(0, 0),
                    reconnect_attempts_max=1,
                )
                conn.set_listener('', listener)
                logger.info("Connecting to STOMP at %s:%s…", settings.stomp_host, settings.stomp_port)
                conn.connect(
                    username=settings.stomp_user,
                    passcode=settings.stomp_pass,
                    wait=True,
                    timeout=15,
                )
                conn.subscribe(destination=settings.topic, id=1, ack='auto')
                logger.info("Subscribed to %s", settings.topic)
                while conn.is_connected():
                    time.sleep(5)
            except Exception as exc:
                logger.error("STOMP connection failed: %s — retrying in 30s", exc)
                self._app_state.connected = False
            time.sleep(30)
