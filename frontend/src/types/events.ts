export type MsgTypeLabel =
  | 'Activation'
  | 'Cancellation'
  | 'Movement'
  | 'Reinstatement'
  | 'Change of Origin'
  | 'Change of Identity'
  | 'Change of Location';

export type VariationStatus = 'ON TIME' | 'EARLY' | 'LATE' | 'OFF ROUTE' | '';

export interface NrEvent {
  id: string;           // MongoDB ObjectId hex string
  received_at: string;
  msg_type: string;
  type_label: MsgTypeLabel;
  train_id: string;
  event_type: 'ARRIVAL' | 'DEPARTURE' | '';
  variation: VariationStatus;
  toc_id: string;
  loc_stanox: string;
  platform: string;
  raw: Record<string, unknown>;  // Native object, no JSON.parse needed
}

export interface HistoryBucket {
  minute: string;
  cnt: number;
}
