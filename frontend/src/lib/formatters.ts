import type { JourneyStop } from '../types/trains';

export function fmtMsTime(ms: number): string {
  if (!ms) return '–';
  try {
    const d = new Date(Number(ms));
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '–';
  }
}

export function fmtIsoTime(iso: string): string {
  if (!iso) return '–';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '–';
  }
}

export function timeSince(iso: string | null | undefined): string {
  if (!iso) return '–';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export function uptimeStr(iso: string | null | undefined): string {
  if (!iso) return '–';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export type StatusClass = 'late' | 'early' | 'ontime' | 'unknown';

export function statusClass(variation: string): StatusClass {
  if (!variation) return 'unknown';
  const v = variation.trim().toUpperCase();
  if (v === 'LATE') return 'late';
  if (v === 'EARLY') return 'early';
  if (v === 'ON TIME') return 'ontime';
  return 'unknown';
}

export function varLabel(timetableVariation: number, variation: string): string {
  if (!variation) return '';
  const v = variation.trim().toUpperCase();
  const n = Math.abs(Math.round(timetableVariation)) || 0;
  if (v === 'ON TIME') return 'On Time';
  if (v === 'LATE') return `+${n}m Late`;
  if (v === 'EARLY') return `${n}m Early`;
  return variation;
}

export function fmtNum(n: number | null | undefined): string {
  if (n === undefined || n === null) return '–';
  return n.toLocaleString();
}

// ── Collapsed stop type (merges ARR+DEP at same stanox) ─────────────────────

export interface CollapsedStop extends Omit<JourneyStop, 'event_type'> {
  arr_ts: number;
  arr_planned: number;
  dep_ts: number;
  dep_planned: number;
  // event_type is overridden to 'ARR/DEP' when merged
  event_type: 'ARRIVAL' | 'DEPARTURE' | '' | 'ARR/DEP';
}

export function collapseJourney(journey: JourneyStop[]): CollapsedStop[] {
  if (!journey.length) return [];
  const result: CollapsedStop[] = [];
  let prev: CollapsedStop | null = null;

  for (const stop of journey) {
    if (stop.is_projected) {
      const cs: CollapsedStop = {
        ...stop,
        event_type: stop.event_type as CollapsedStop['event_type'],
        arr_ts: 0,
        arr_planned: 0,
        dep_ts: 0,
        dep_planned: 0,
      };
      result.push(cs);
      prev = null;
      continue;
    }

    if (prev && prev.stanox === stop.stanox && !prev.is_projected) {
      if (stop.event_type === 'DEPARTURE') {
        prev.dep_ts = stop.actual_ts;
        prev.dep_planned = stop.planned_ts;
      }
      if (stop.event_type === 'ARRIVAL') {
        prev.arr_ts = stop.actual_ts;
        prev.arr_planned = stop.planned_ts;
      }
      prev.event_type = 'ARR/DEP';
      prev.variation_status = stop.variation_status || prev.variation_status;
      prev.timetable_variation = stop.timetable_variation;
      prev.platform = stop.platform || prev.platform;
      prev.next_stanox = stop.next_stanox || prev.next_stanox;
    } else {
      const cs: CollapsedStop = {
        ...stop,
        event_type: stop.event_type as CollapsedStop['event_type'],
        arr_ts: stop.event_type === 'ARRIVAL' ? stop.actual_ts : 0,
        arr_planned: stop.event_type === 'ARRIVAL' ? stop.planned_ts : 0,
        dep_ts: stop.event_type === 'DEPARTURE' ? stop.actual_ts : 0,
        dep_planned: stop.event_type === 'DEPARTURE' ? stop.planned_ts : 0,
      };
      result.push(cs);
      prev = cs;
    }
  }

  return result;
}
