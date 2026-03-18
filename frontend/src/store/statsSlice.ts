import type { StateCreator } from 'zustand';
import type { StatsResponse } from '../types/stats';

export interface StatsSlice {
  stats: StatsResponse | null;
  setStats: (stats: StatsResponse) => void;
}

export const createStatsSlice: StateCreator<StatsSlice, [], [], StatsSlice> = (set) => ({
  stats: null,

  setStats: (stats: StatsResponse) => {
    set({ stats });
  },
});
