import type { VariationStatus } from './events';

export interface MapTrain {
  train_id: string;
  toc_id: string;
  variation: VariationStatus;
  timetable_variation: number;
  terminated: boolean;
  cancelled: boolean;
  stop_count: number;
  last_event_at: string;
  last_stanox: string;
  last_stanox_name: string;
  last_lat: number;
  last_lng: number;
  next_stanox: string;
  next_stanox_name: string;
  next_lat: number | null;
  next_lng: number | null;
  last_actual_ts: number;
  last_event_type: 'ARRIVAL' | 'DEPARTURE' | '';
  next_run_time: number;
}

export interface MapMeta {
  total: number;
  mappable: number;
  late: number;
  on_time: number;
  early: number;
  cancelled: number;
  events_per_minute: number;
  connected: boolean;
  coords_loaded: number;
}
