import type { StateCreator } from 'zustand';
import type { TrainSummary, TrainDetail } from '../types/trains';

export interface TrainsSlice {
  trainList: TrainSummary[];
  selectedId: string | null;
  detailCache: Record<string, TrainDetail>;
  setTrainList: (trains: TrainSummary[]) => void;
  updateTrain: (train: TrainSummary) => void;
  removeTrain: (trainId: string) => void;
  setSelectedId: (id: string | null) => void;
  setDetail: (detail: TrainDetail) => void;
}

export const createTrainsSlice: StateCreator<TrainsSlice, [], [], TrainsSlice> = (set) => ({
  trainList: [],
  selectedId: null,
  detailCache: {},

  setTrainList: (trains: TrainSummary[]) => {
    set({ trainList: trains });
  },

  updateTrain: (train: TrainSummary) => {
    set((state) => {
      const idx = state.trainList.findIndex((t) => t.train_id === train.train_id);
      if (idx === -1) {
        return { trainList: [train, ...state.trainList] };
      }
      const updated = [...state.trainList];
      updated[idx] = train;
      return { trainList: updated };
    });
  },

  removeTrain: (trainId: string) => {
    set((state) => ({
      trainList: state.trainList.filter((t) => t.train_id !== trainId),
    }));
  },

  setSelectedId: (id: string | null) => {
    set({ selectedId: id });
  },

  setDetail: (detail: TrainDetail) => {
    set((state) => ({
      detailCache: { ...state.detailCache, [detail.train_id]: detail },
    }));
  },
});
