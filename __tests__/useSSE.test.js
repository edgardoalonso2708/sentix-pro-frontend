import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '../app/hooks/useSSE';

// ─── Mock EventSource ─────────────────────────────────────────────────────────
class MockEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.readyState = 0;
    this.closed = false;
    MockEventSource.instances.push(this);
  }
  close() {
    this.closed = true;
    this.readyState = 2;
  }
  // Simulate opening the connection
  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
  // Simulate receiving a message
  simulateMessage(data) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  // Simulate an error/disconnect
  simulateError() {
    this.onerror?.();
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useSSE', () => {
  it('connects to SSE endpoint on mount', () => {
    renderHook(() => useSSE('http://localhost:3001', {}));

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('http://localhost:3001/api/stream');
  });

  it('appends auth token as query param', () => {
    renderHook(() => useSSE('http://localhost:3001', {}, { token: 'abc123' }));

    expect(MockEventSource.instances[0].url).toBe(
      'http://localhost:3001/api/stream?token=abc123'
    );
  });

  it('sets connected=true on open', () => {
    const { result } = renderHook(() => useSSE('http://localhost:3001', {}));

    expect(result.current.connected).toBe(false);

    act(() => {
      MockEventSource.instances[0].simulateOpen();
    });

    expect(result.current.connected).toBe(true);
  });

  it('dispatches messages to correct handler', () => {
    const marketHandler = vi.fn();
    const signalHandler = vi.fn();

    renderHook(() =>
      useSSE('http://localhost:3001', {
        market: marketHandler,
        signals: signalHandler,
      })
    );

    act(() => {
      MockEventSource.instances[0].simulateOpen();
      MockEventSource.instances[0].simulateMessage({
        type: 'market',
        data: { btc: 65000 },
        timestamp: '2024-01-01T00:00:00Z',
      });
    });

    expect(marketHandler).toHaveBeenCalledWith(
      { btc: 65000 },
      '2024-01-01T00:00:00Z'
    );
    expect(signalHandler).not.toHaveBeenCalled();
  });

  it('ignores messages with unknown type', () => {
    const handler = vi.fn();
    renderHook(() => useSSE('http://localhost:3001', { market: handler }));

    act(() => {
      MockEventSource.instances[0].simulateOpen();
      MockEventSource.instances[0].simulateMessage({
        type: 'unknown_event',
        data: {},
      });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('reconnects with exponential backoff on error', () => {
    renderHook(() => useSSE('http://localhost:3001', {}));

    expect(MockEventSource.instances).toHaveLength(1);

    // First disconnect — should reconnect after 1s
    act(() => {
      MockEventSource.instances[0].simulateError();
    });

    expect(MockEventSource.instances).toHaveLength(1); // Not yet reconnected

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockEventSource.instances).toHaveLength(2); // Reconnected

    // Second disconnect — should reconnect after 2s
    act(() => {
      MockEventSource.instances[1].simulateError();
    });

    act(() => {
      vi.advanceTimersByTime(1000); // Only 1s — not enough
    });
    expect(MockEventSource.instances).toHaveLength(2); // Still waiting

    act(() => {
      vi.advanceTimersByTime(1000); // Total 2s now
    });
    expect(MockEventSource.instances).toHaveLength(3); // Reconnected
  });

  it('resets retry counter on successful reconnect', () => {
    renderHook(() => useSSE('http://localhost:3001', {}));

    // Disconnect and reconnect
    act(() => {
      MockEventSource.instances[0].simulateError();
      vi.advanceTimersByTime(1000);
    });

    // Successful open — resets counter
    act(() => {
      MockEventSource.instances[1].simulateOpen();
    });

    // Disconnect again — should use 1s delay (reset)
    act(() => {
      MockEventSource.instances[1].simulateError();
      vi.advanceTimersByTime(1000);
    });

    expect(MockEventSource.instances).toHaveLength(3);
  });

  it('closes connection on unmount', () => {
    const { unmount } = renderHook(() => useSSE('http://localhost:3001', {}));

    const es = MockEventSource.instances[0];
    expect(es.closed).toBe(false);

    unmount();

    expect(es.closed).toBe(true);
  });

  it('does not connect when apiUrl is empty', () => {
    renderHook(() => useSSE('', {}));
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('exposes reconnect function', () => {
    const { result } = renderHook(() => useSSE('http://localhost:3001', {}));

    expect(typeof result.current.reconnect).toBe('function');

    act(() => {
      result.current.reconnect();
    });

    // Should have created a new EventSource (old one closed + new one)
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[0].closed).toBe(true);
  });
});
