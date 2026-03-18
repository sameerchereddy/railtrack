import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useStore } from '../store';
import type { WsTrainsMessage } from '../types/ws';

export function useTrainsWs(): { connected: boolean } {
  const setTrainList = useStore((s) => s.setTrainList);
  const updateTrain = useStore((s) => s.updateTrain);
  const removeTrain = useStore((s) => s.removeTrain);
  const setDetail = useStore((s) => s.setDetail);

  const onMessage = useCallback(
    (msg: WsTrainsMessage) => {
      switch (msg.type) {
        case 'train_list':
          setTrainList(msg.trains);
          break;
        case 'train_update':
          updateTrain(msg.train);
          break;
        case 'train_remove':
          removeTrain(msg.train_id);
          break;
        case 'train_detail_update':
          setDetail(msg.detail);
          break;
      }
    },
    [setTrainList, updateTrain, removeTrain, setDetail]
  );

  const { connected } = useWebSocket<WsTrainsMessage>({
    url: '/ws/trains',
    onMessage,
  });

  return { connected };
}
