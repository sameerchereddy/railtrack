import type { NrEvent } from '../types/events';
import type { StatsResponse } from '../types/stats';
import type { TrainSummary, TrainDetail } from '../types/trains';
import type { MapTrain, MapMeta } from '../types/map';

const BASE = '/api';

export interface EventParams {
  since?: string;
  limit?: number;
  type?: string;
  toc?: string;
  train?: string;
}

export interface TrainParams {
  status?: string;
  toc?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export const api = {
  getStats: (): Promise<StatsResponse> =>
    fetchJson<StatsResponse>(`${BASE}/stats`),

  getEvents: (params: EventParams = {}): Promise<NrEvent[]> => {
    const q = buildQuery({
      since: params.since,
      limit: params.limit ?? 200,
      type: params.type,
      toc: params.toc,
    });
    return fetchJson<NrEvent[]>(`${BASE}/events${q}`);
  },

  getEventsHistory: (): Promise<{ minute: string; cnt: number }[]> =>
    fetchJson<{ minute: string; cnt: number }[]>(`${BASE}/events/history`),

  getTrains: (params: TrainParams = {}): Promise<TrainSummary[]> => {
    const q = buildQuery({
      status: params.status,
      toc: params.toc,
      search: params.search,
      limit: params.limit,
      offset: params.offset,
    });
    return fetchJson<TrainSummary[]>(`${BASE}/trains${q}`);
  },

  getTrainDetail: (trainId: string): Promise<TrainDetail> =>
    fetchJson<TrainDetail>(`${BASE}/trains/${encodeURIComponent(trainId)}`),

  getMapTrains: (): Promise<MapTrain[]> =>
    fetchJson<MapTrain[]>(`${BASE}/map/trains`),

  getMapMeta: (): Promise<MapMeta> =>
    fetchJson<MapMeta>(`${BASE}/map/meta`),

  getTocNames: (): Promise<Record<string, string>> =>
    fetchJson<Record<string, string>>(`${BASE}/toc-names`),
};
