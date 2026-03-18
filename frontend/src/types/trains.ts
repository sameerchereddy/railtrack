import type { VariationStatus } from './events';

export interface TrainSummary {
  train_id: string;
  toc_id: string;
  first_seen: string;
  last_event_at: string;
  last_stanox: string;
  last_stanox_name: string;
  next_stanox: string;
  next_stanox_name: string;
  variation: VariationStatus;
  timetable_variation: number;
  terminated: boolean;
  cancelled: boolean;
  stop_count: number;
  direction: 'UP' | 'DOWN' | '';
  origin_stanox: string;
  origin_stanox_name: string;
  train_uid: string;
}

export interface JourneyStop {
  seq: number;
  stanox: string;
  stanox_name: string;
  event_type: 'ARRIVAL' | 'DEPARTURE' | '';
  planned_ts: number;
  actual_ts: number;
  variation_status: VariationStatus;
  timetable_variation: number;
  platform: string;
  direction: string;
  next_stanox: string;
  next_run_time: number;
  lat: number | null;
  lng: number | null;
  is_projected?: boolean;
}

export interface TrainDetail extends TrainSummary {
  origin_dep_ts: number;
  journey: JourneyStop[];
}
