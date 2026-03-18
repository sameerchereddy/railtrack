import type { NrEvent } from './events';
import type { StatsResponse } from './stats';
import type { TrainSummary, TrainDetail } from './trains';
import type { MapTrain, MapMeta } from './map';

// ── Events WebSocket (/ws/events) ──────────────────────────────────────────

export interface WsEventsInit {
  type: 'init';
  events: NrEvent[];
  stats: StatsResponse;
}

export interface WsEventsBatch {
  type: 'event_batch';
  events: NrEvent[];
}

export interface WsEventsStats {
  type: 'stats';
  data: StatsResponse;
}

export type WsEventsMessage = WsEventsInit | WsEventsBatch | WsEventsStats;

// ── Trains WebSocket (/ws/trains) ──────────────────────────────────────────

export interface WsTrainsUpdate {
  type: 'train_update';
  train: TrainSummary;
}

export interface WsTrainsRemove {
  type: 'train_remove';
  train_id: string;
}

export interface WsTrainsDetailUpdate {
  type: 'train_detail_update';
  detail: TrainDetail;
}

export interface WsTrainsList {
  type: 'train_list';
  trains: TrainSummary[];
}

export type WsTrainsMessage =
  | WsTrainsUpdate
  | WsTrainsRemove
  | WsTrainsDetailUpdate
  | WsTrainsList;

// ── Map WebSocket (/ws/map) ────────────────────────────────────────────────

export interface WsMapUpdate {
  type: 'map_update';
  trains: MapTrain[];
  meta: MapMeta;
}

export type WsMapMessage = WsMapUpdate;
