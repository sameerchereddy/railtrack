import type { VariationStatus } from './events';

export interface StatsResponse {
  total: number;
  connected: boolean;
  started_at: string;
  last_event_at: string | null;
  type_counts: Record<string, number>;
  toc_counts: Record<string, number>;
  variation_counts: Record<VariationStatus, number>;
  events_per_minute: number;
}
