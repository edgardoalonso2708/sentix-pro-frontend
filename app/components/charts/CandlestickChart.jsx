'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { authFetch } from '../../lib/api';
import { colors } from '../../lib/theme';

const INTERVALS = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

export default function CandlestickChart({
  apiUrl,
  asset = 'bitcoin',
  interval: initialInterval = '1h',
  limit = 200,
  height = 400,
  markers = [],
  showControls = true,
  onIntervalChange,
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [interval, setInterval_] = useState(initialInterval);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandles = useCallback(async (iv) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`${apiUrl}/api/candles/${asset}?interval=${iv}&limit=${limit}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch candles');
      }
      return await res.json();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiUrl, asset, limit]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: colors.bg2 },
        textColor: colors.muted,
        fontSize: 11,
        fontFamily: 'monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 2 },
        horzLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: colors.green,
      downColor: colors.red,
      borderUpColor: colors.green,
      borderDownColor: colors.red,
      wickUpColor: colors.green,
      wickDownColor: colors.red,
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  // Fetch and set data when asset/interval changes
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const data = await fetchCandles(interval);
      if (cancelled || !data || !candleSeriesRef.current) return;

      candleSeriesRef.current.setData(data);
      volumeSeriesRef.current.setData(
        data.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open
            ? 'rgba(0,212,170,0.3)'
            : 'rgba(239,68,68,0.3)',
        }))
      );

      // Apply markers if provided
      if (markers.length > 0) {
        candleSeriesRef.current.setMarkers(
          markers.sort((a, b) => a.time - b.time)
        );
      }

      chartRef.current?.timeScale().fitContent();
    };

    loadData();

    // Poll latest candle every 60s
    const pollInterval = globalThis.setInterval(async () => {
      const data = await fetchCandles(interval);
      if (cancelled || !data || !candleSeriesRef.current) return;
      candleSeriesRef.current.setData(data);
      volumeSeriesRef.current.setData(
        data.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open
            ? 'rgba(0,212,170,0.3)'
            : 'rgba(239,68,68,0.3)',
        }))
      );
    }, 60000);

    return () => {
      cancelled = true;
      globalThis.clearInterval(pollInterval);
    };
  }, [asset, interval, fetchCandles, markers]);

  const handleIntervalChange = (iv) => {
    setInterval_(iv);
    onIntervalChange?.(iv);
  };

  return (
    <div>
      {showControls && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {INTERVALS.map(iv => (
            <button
              key={iv.value}
              onClick={() => handleIntervalChange(iv.value)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 700,
                border: interval === iv.value ? `1px solid ${colors.blue}` : `1px solid ${colors.border}`,
                background: interval === iv.value ? `${colors.blue}20` : 'transparent',
                color: interval === iv.value ? colors.blue : colors.muted,
                cursor: 'pointer',
              }}
            >
              {iv.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
        <div ref={chartContainerRef} />
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,10,0.7)', color: colors.muted,
            fontSize: 11, fontFamily: 'monospace',
          }}>
            Loading candles...
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,10,0.7)', color: colors.red,
            fontSize: 11, fontFamily: 'monospace',
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
