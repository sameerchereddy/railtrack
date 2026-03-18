"""Trains REST API router.

Endpoints:
- GET /trains/{train_id} — full detail for a single train including journey,
                           reconstructed from MongoDB events on demand.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from api.database import get_db
from api.reference import sname

logger = logging.getLogger(__name__)

TRAIN_MAX_AGE_H = 6


def create_trains_router(ref_data: Any) -> APIRouter:
    """Create the trains router with injected ref_data."""
    r = APIRouter()

    @r.get("/trains/{train_id}", response_model=dict)
    async def get_train_detail(train_id: str) -> dict:
        """Return full detail for a single train including enriched journey stops.

        Queries MongoDB for all events belonging to this train in the last
        TRAIN_MAX_AGE_H hours and replays them to reconstruct the journey.
        Each journey stop is enriched with lat/lng from stanox_coords.
        A projected next stop is appended if the train is not terminated.
        """
        db = get_db()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=TRAIN_MAX_AGE_H)

        rows = await db.events.find(
            {'train_id': train_id, 'received_at': {'$gte': cutoff}}
        ).sort('_id', 1).to_list(length=None)

        if not rows:
            raise HTTPException(status_code=404, detail='not found')

        first = rows[0]
        first_ts = (
            first['received_at'].isoformat()
            if hasattr(first['received_at'], 'isoformat')
            else first['received_at']
        )

        t: dict = {
            'train_id': train_id,
            'toc_id': '',
            'first_seen': first_ts,
            'last_event_at': first_ts,
            'last_stanox': '',
            'next_stanox': '',
            'variation': '',
            'timetable_variation': 0,
            'terminated': False,
            'cancelled': False,
            'direction': '',
            'train_uid': '',
            'origin_stanox': '',
            'origin_dep_ts': 0,
            'journey': [],
        }

        for row in rows:
            ev = row['raw']
            header = ev.get('header', {})
            body = ev.get('body', {})
            msg_type = header.get('msg_type', '')
            received_at = (
                row['received_at'].isoformat()
                if hasattr(row['received_at'], 'isoformat')
                else row['received_at']
            )

            t['last_event_at'] = received_at
            toc_id = body.get('toc_id', '').strip()
            if toc_id:
                t['toc_id'] = toc_id

            if msg_type == '0001':  # Activation
                t['train_uid'] = body.get('train_uid', '')
                t['origin_stanox'] = body.get('sched_origin_stanox', '')
                try:
                    raw_ts = body.get('origin_dep_timestamp', '')
                    t['origin_dep_ts'] = int(raw_ts) if raw_ts else 0
                except Exception:
                    pass

            elif msg_type == '0002':  # Cancellation
                t['cancelled'] = True
                t['last_stanox'] = body.get('loc_stanox', t['last_stanox'])

            elif msg_type == '0003':  # Movement
                stanox = body.get('loc_stanox', '')
                t['last_stanox'] = stanox
                t['next_stanox'] = body.get('next_report_stanox', '')
                t['variation'] = body.get('variation_status', '').strip()
                t['direction'] = body.get('direction_ind', '')
                t['terminated'] = body.get('train_terminated', 'false').lower() == 'true'
                try:
                    t['timetable_variation'] = int(body.get('timetable_variation', 0) or 0)
                except Exception:
                    pass

                try:
                    planned_ts = int(body.get('planned_timestamp', 0) or 0)
                    actual_ts = int(body.get('actual_timestamp', 0) or 0)
                    next_run_time = int(body.get('next_report_run_time', 0) or 0)
                except Exception:
                    planned_ts = actual_ts = next_run_time = 0

                c = ref_data.stanox_coords.get(stanox)
                if len(t['journey']) < 150:
                    t['journey'].append({
                        'seq': len(t['journey']),
                        'stanox': stanox,
                        'stanox_name': sname(
                            stanox,
                            ref_data.stanox_coords,
                            ref_data.stanox_crs_map,
                            ref_data.stanox_lookup,
                        ),
                        'event_type': body.get('event_type', ''),
                        'planned_ts': planned_ts,
                        'actual_ts': actual_ts,
                        'variation_status': body.get('variation_status', '').strip(),
                        'timetable_variation': t['timetable_variation'],
                        'platform': body.get('platform', '').strip(),
                        'direction': body.get('direction_ind', ''),
                        'next_stanox': body.get('next_report_stanox', ''),
                        'next_run_time': next_run_time,
                        'lat': c['lat'] if c else None,
                        'lng': c['lng'] if c else None,
                    })

        t['stop_count'] = len(t['journey'])
        t['origin_stanox_name'] = sname(
            t['origin_stanox'],
            ref_data.stanox_coords,
            ref_data.stanox_crs_map,
            ref_data.stanox_lookup,
        )

        # Append projected next stop if not terminated
        next_stanox = t.get('next_stanox', '')
        journey = t['journey']
        if journey and next_stanox and not t.get('terminated'):
            last = journey[-1]
            if last.get('stanox') != next_stanox:
                next_c = ref_data.stanox_coords.get(next_stanox)
                journey.append({
                    'seq': len(journey),
                    'stanox': next_stanox,
                    'stanox_name': sname(
                        next_stanox,
                        ref_data.stanox_coords,
                        ref_data.stanox_crs_map,
                        ref_data.stanox_lookup,
                    ),
                    'event_type': '',
                    'planned_ts': 0,
                    'actual_ts': 0,
                    'variation_status': '',
                    'timetable_variation': 0,
                    'platform': '',
                    'is_projected': True,
                    'lat': next_c['lat'] if next_c else None,
                    'lng': next_c['lng'] if next_c else None,
                })

        return t

    return r
