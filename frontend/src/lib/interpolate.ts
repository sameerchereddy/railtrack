import type { MapTrain } from '../types/map';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Interpolate a train's current geographic position between last known
 * departure station and next expected station, based on elapsed time
 * relative to next_run_time (scheduled minutes between stops).
 */
export function interpolatePosition(t: MapTrain): LatLng {
  if (
    t.last_event_type === 'DEPARTURE' &&
    t.next_lat !== null &&
    t.next_lng !== null &&
    t.last_actual_ts > 0 &&
    t.next_run_time > 0
  ) {
    const elapsed = Date.now() - t.last_actual_ts;
    const totalMs = t.next_run_time * 60 * 1000;
    const frac = Math.min(Math.max(elapsed / totalMs, 0), 1);
    return {
      lat: t.last_lat + (t.next_lat - t.last_lat) * frac,
      lng: t.last_lng + (t.next_lng - t.last_lng) * frac,
    };
  }
  return { lat: t.last_lat, lng: t.last_lng };
}
