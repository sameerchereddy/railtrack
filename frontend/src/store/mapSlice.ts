import type { StateCreator } from 'zustand';
import type { MapTrain, MapMeta } from '../types/map';

export interface MapSlice {
  trainData: Record<string, MapTrain>;
  mapMeta: MapMeta | null;
  setMapData: (trains: MapTrain[], meta: MapMeta) => void;
}

export const createMapSlice: StateCreator<MapSlice, [], [], MapSlice> = (set) => ({
  trainData: {},
  mapMeta: null,

  setMapData: (trains: MapTrain[], meta: MapMeta) => {
    const trainData: Record<string, MapTrain> = {};
    for (const t of trains) {
      trainData[t.train_id] = t;
    }
    set({ trainData, mapMeta: meta });
  },
});
