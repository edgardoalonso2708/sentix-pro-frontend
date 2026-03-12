'use client';
import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Custom hook for Server-Sent Events (SSE) connection.
 * Auto-reconnects with exponential backoff on disconnect.
 *
 * @param {string} apiUrl - Base API URL (e.g., 'http://localhost:3001')
 * @param {Object} handlers - Map of event type → handler function
 *   e.g. { market: (data) => ..., signals: (data) => ... }
 * @param {Object} options - Optional config
 * @param {string} options.token - Auth token for SSE (passed as query param)
 * @returns {{ connected: boolean, reconnect: () => void }}
 */
export function useSSE(apiUrl, handlers, options = {}) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const handlersRef = useRef(handlers);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // Keep handlers ref fresh without re-triggering effect
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (!apiUrl || !mountedRef.current) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // Build URL with optional auth token
    let streamUrl = `${apiUrl}/api/stream`;
    if (options.token) {
      streamUrl += `?token=${encodeURIComponent(options.token)}`;
    }

    try {
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        retriesRef.current = 0;
        console.log('[SSE] Connected to', streamUrl.split('?')[0]);
      };

      es.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data);
          const handler = handlersRef.current[parsed.type];
          if (handler) {
            handler(parsed.data, parsed.timestamp);
          }
        } catch (e) {
          // Ignore parse errors (heartbeat pings, etc.)
        }
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        es.close();
        eventSourceRef.current = null;
        setConnected(false);

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
        retriesRef.current++;
        console.log(`[SSE] Disconnected. Reconnecting in ${delay / 1000}s (attempt ${retriesRef.current})`);

        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      };
    } catch (err) {
      console.error('[SSE] Failed to create EventSource:', err);
      setConnected(false);
    }
  }, [apiUrl, options.token]);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  return { connected, reconnect: connect };
}
