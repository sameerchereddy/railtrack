import type { StateCreator } from 'zustand';
import type { NrEvent } from '../types/events';

const MAX_EVENTS = 2000;

export interface EventsSlice {
  allEvents: NrEvent[];
  lastId: string;
  paused: boolean;
  pendingCount: number;
  prependEvents: (events: NrEvent[]) => void;
  setPaused: (paused: boolean) => void;
  flush: () => void;
}

export const createEventsSlice: StateCreator<EventsSlice, [], [], EventsSlice> = (set, get) => ({
  allEvents: [],
  lastId: '',
  paused: false,
  pendingCount: 0,

  prependEvents: (events: NrEvent[]) => {
    if (!events || events.length === 0) return;
    const { paused, allEvents, lastId } = get();

    if (paused) {
      set((state) => ({
        pendingCount: state.pendingCount + events.length,
        lastId: events[0]?.id ?? state.lastId,
      }));
      return;
    }

    const merged = [...events, ...allEvents].slice(0, MAX_EVENTS);
    // Deduplicate
    const seen = new Set<string>();
    const deduped = merged.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    set({
      allEvents: deduped,
      lastId: events[0]?.id ?? lastId,
    });
  },

  setPaused: (paused: boolean) => {
    set({ paused });
  },

  flush: () => {
    set({ pendingCount: 0 });
  },
});
