import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createMapSlice, type MapSlice } from './mapSlice';

export type AppStore = MapSlice;

export const useStore = create<AppStore>()(
  subscribeWithSelector((...args) => ({
    ...createMapSlice(...args),
  }))
);

export { useStore as useMapStore };
