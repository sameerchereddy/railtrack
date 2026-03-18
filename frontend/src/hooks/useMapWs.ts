import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useStore } from '../store';
import type { WsMapMessage } from '../types/ws';

export function useMapWs(): { connected: boolean } {
  const setMapData = useStore((s) => s.setMapData);

  const onMessage = useCallback(
    (msg: WsMapMessage) => {
      if (msg.type === 'map_update') {
        setMapData(msg.trains, msg.meta);
      }
    },
    [setMapData]
  );

  const { connected } = useWebSocket<WsMapMessage>({
    url: '/ws/map',
    onMessage,
  });

  return { connected };
}
