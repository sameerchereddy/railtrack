import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions<T> {
  url: string;
  onMessage: (msg: T) => void;
  enabled?: boolean;
}

interface UseWebSocketResult {
  connected: boolean;
  reconnectCount: number;
}

const BACKOFF_STEPS = [1000, 2000, 4000, 8000, 30000];

export function useWebSocket<T>(options: UseWebSocketOptions<T>): UseWebSocketResult {
  const { url, onMessage, enabled = true } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);

  // Keep the callback ref up to date without triggering reconnect
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) return;

    function connect() {
      if (!mountedRef.current) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        reconnectCountRef.current = 0;
        setConnected(true);
        setReconnectCount(0);
        console.debug(`[WS] Connected: ${url}`);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data as string) as T;
          onMessageRef.current(data);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error(`[WS] Error on ${url}:`, err);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        wsRef.current = null;

        const attempt = reconnectCountRef.current;
        const delay = BACKOFF_STEPS[Math.min(attempt, BACKOFF_STEPS.length - 1)];
        reconnectCountRef.current += 1;
        setReconnectCount(reconnectCountRef.current);

        console.debug(`[WS] Disconnected from ${url}. Reconnecting in ${delay}ms (attempt ${attempt + 1})`);
        timerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url, enabled]);

  return { connected, reconnectCount };
}
