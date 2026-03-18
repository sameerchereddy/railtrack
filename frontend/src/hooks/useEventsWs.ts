import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useStore } from '../store';
import type { WsEventsMessage } from '../types/ws';

export function useEventsWs(): { connected: boolean } {
  const prependEvents = useStore((s) => s.prependEvents);
  const paused = useStore((s) => s.paused);
  const setStats = useStore((s) => s.setStats);

  const onMessage = useCallback(
    (msg: WsEventsMessage) => {
      switch (msg.type) {
        case 'init':
          prependEvents(msg.events);
          setStats(msg.stats);
          break;
        case 'event_batch':
          if (!paused) {
            prependEvents(msg.events);
          } else {
            // Just increment pending count without storing
            useStore.setState((state) => ({
              pendingCount: state.pendingCount + msg.events.length,
            }));
          }
          break;
        case 'stats':
          setStats(msg.data);
          break;
      }
    },
    [prependEvents, setStats, paused]
  );

  const { connected } = useWebSocket<WsEventsMessage>({
    url: '/ws/events',
    onMessage,
  });

  return { connected };
}
