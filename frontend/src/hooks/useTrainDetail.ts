import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store';
import { api } from '../lib/api';
import type { TrainDetail } from '../types/trains';

export function useTrainDetail(trainId: string | null): {
  detail: TrainDetail | null;
  loading: boolean;
} {
  const setDetail = useStore((s) => s.setDetail);
  const detailCache = useStore((s) => s.detailCache);

  const { data, isLoading } = useQuery({
    queryKey: ['trainDetail', trainId],
    queryFn: () => api.getTrainDetail(trainId!),
    enabled: trainId !== null,
    refetchInterval: 4000,
    staleTime: 2000,
  });

  useEffect(() => {
    if (data) {
      setDetail(data);
    }
  }, [data, setDetail]);

  const detail = trainId ? (detailCache[trainId] ?? data ?? null) : null;
  const loading = isLoading && !detail;

  return { detail, loading };
}
