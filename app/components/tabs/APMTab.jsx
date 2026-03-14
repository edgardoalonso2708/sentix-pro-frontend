'use client';
import { colors, card, sTitle } from '../../lib/theme';

const { bg, bg2, bg3, border, text, muted, green, red, amber, purple } = colors;

export default function APMTab({ apmData, systemHealth }) {
    const m = apmData;
    const h = systemHealth;

    const fmtBytes = (b) => {
      if (!b || b === 0) return '0 B';
      if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
      if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
      return (b / 1024).toFixed(0) + ' KB';
    };

    const fmtUptime = (s) => {
      if (!s) return '--';
      const d = Math.floor(s / 86400);
      const hrs = Math.floor((s % 86400) / 3600);
      const min = Math.floor((s % 3600) / 60);
      return d > 0 ? `${d}d ${hrs}h ${min}m` : hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;
    };

    const pill = (label, status) => {
      const c = status === 'ok' || status === 'active' || status === 'healthy' ? green
        : status === 'degraded' || status === 'stale' ? amber
        : status === 'disabled' || status === 'down' || status === 'unavailable' ? red : muted;
      return (
        <span style={{
          display: "inline-block", padding: "2px 8px", borderRadius: 4,
          background: `${c}22`, color: c, fontSize: 10, fontFamily: "monospace", fontWeight: 600
        }}>{label}</span>
      );
    };

    const metricCard = (label, value, sub, color = text) => (
      <div style={{
        background: bg3, borderRadius: 8, padding: "12px 16px", flex: "1 1 0",
        minWidth: 120, border: `1px solid ${border}`
      }}>
        <div style={{ fontSize: 9, color: muted, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
        {sub && <div style={{ fontSize: 9, color: muted, fontFamily: "monospace", marginTop: 2 }}>{sub}</div>}
      </div>
    );

    const counters = m?.counters || {};
    const histograms = m?.histograms || {};
    const gauges = m?.gauges || {};
    const caches = m?.caches || {};
    const workers = m?.workers || {};
    const httpLatency = histograms['http.latency'] || {};
    const totalReqs = counters['http.requests'] || 0;
    const totalErrors = counters['http.errors'] || 0;
    const errorRate = totalReqs > 0 ? ((totalErrors / totalReqs) * 100).toFixed(2) : '0.00';

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: text, fontFamily: "monospace" }}>
              SYSTEM MONITOR
            </div>
            <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 4 }}>
              Metricas en tiempo real · Auto-refresh 15s
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {pill(h?.status === 'healthy' ? 'HEALTHY' : h?.status?.toUpperCase() || 'OFFLINE', h?.status === 'healthy' ? 'ok' : h?.status || 'down')}
            {m && <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
              {new Date(m.collectedAt).toLocaleTimeString()}
            </span>}
          </div>
        </div>

        {!m ? (
          <div style={{ ...card, textAlign: "center", padding: 40, color: muted, fontFamily: "monospace", fontSize: 12 }}>
            Esperando conexion con el backend...
          </div>
        ) : (
          <>
            {/* Row 1: System Status */}
            <div style={card}>
              <div style={sTitle}>ESTADO DEL SISTEMA</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {metricCard("Uptime", fmtUptime(m.uptimeSeconds || gauges['process.uptime'] || h?.uptime))}
                {metricCard("Database", h?.checks?.database?.status === 'ok' ? 'OK' : 'DOWN', h?.checks?.database?.latencyMs ? `${h.checks.database.latencyMs}ms` : null,
                  h?.checks?.database?.status === 'ok' ? green : red)}
                {metricCard("Market Data", h?.checks?.marketData?.status === 'ok' ? 'FRESH' : h?.checks?.marketData?.status || '--',
                  h?.checks?.marketData?.ageSeconds ? `${h.checks.marketData.ageSeconds}s ago` : null,
                  h?.checks?.marketData?.status === 'ok' ? green : amber)}
                {metricCard("SSE Clients", gauges['sse.clients'] ?? h?.checks?.sse?.clients ?? 0)}
                {metricCard("Telegram", h?.checks?.telegram === 'active' ? 'ON' : 'OFF', null,
                  h?.checks?.telegram === 'active' ? green : muted)}
              </div>
            </div>

            {/* Row 2: HTTP Performance */}
            <div style={card}>
              <div style={sTitle}>HTTP PERFORMANCE</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {metricCard("Requests", totalReqs.toLocaleString())}
                {metricCard("Errors", totalErrors.toLocaleString(), null, totalErrors > 0 ? red : green)}
                {metricCard("Error Rate", `${errorRate}%`, null, parseFloat(errorRate) > 5 ? red : parseFloat(errorRate) > 1 ? amber : green)}
                {metricCard("p50", httpLatency.p50 != null ? `${httpLatency.p50}ms` : '--', 'median')}
                {metricCard("p95", httpLatency.p95 != null ? `${httpLatency.p95}ms` : '--', 'slow', httpLatency.p95 > 1000 ? red : httpLatency.p95 > 500 ? amber : text)}
                {metricCard("p99", httpLatency.p99 != null ? `${httpLatency.p99}ms` : '--', 'worst', httpLatency.p99 > 2000 ? red : httpLatency.p99 > 1000 ? amber : text)}
              </div>
            </div>

            {/* Row 3: Application Metrics */}
            <div style={card}>
              <div style={sTitle}>APLICACION</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {metricCard("SSE Broadcasts", (counters['sse.broadcasts'] || 0).toLocaleString())}
                {metricCard("Signals", (counters['signals.generated'] || 0).toLocaleString())}
                {metricCard("Alerts Sent", (counters['alerts.telegram'] || 0).toLocaleString(), 'telegram')}
                {metricCard("Backtests", (counters['backtests.completed'] || 0).toLocaleString())}
              </div>
            </div>

            {/* Row 4: Caches */}
            {Object.keys(caches).length > 0 && (
              <div style={card}>
                <div style={sTitle}>CACHES</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(caches).map(([name, c]) => {
                    const hitRate = c.hitRate != null ? (c.hitRate * 100).toFixed(1) : '0.0';
                    return (
                      <div key={name} style={{
                        background: bg3, borderRadius: 8, padding: "12px 16px", flex: "1 1 0",
                        minWidth: 180, border: `1px solid ${border}`
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: purple, fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" }}>
                          {name}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>Size</span>
                          <span style={{ fontSize: 10, color: text, fontFamily: "monospace", fontWeight: 600 }}>{c.size || 0} / {c.maxSize || '?'}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>Hit Rate</span>
                          <span style={{ fontSize: 10, color: parseFloat(hitRate) > 80 ? green : parseFloat(hitRate) > 50 ? amber : red, fontFamily: "monospace", fontWeight: 600 }}>{hitRate}%</span>
                        </div>
                        <div style={{
                          height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%", width: `${Math.min(100, parseFloat(hitRate))}%`, borderRadius: 2,
                            background: parseFloat(hitRate) > 80 ? green : parseFloat(hitRate) > 50 ? amber : red
                          }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>Hits: {c.hits || 0}</span>
                          <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>Miss: {c.misses || 0}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 5: Workers */}
            {Object.keys(workers).length > 0 && (
              <div style={card}>
                <div style={sTitle}>WORKERS</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(workers).map(([name, w]) => {
                    const wc = w.counters || {};
                    const wh = w.histograms || {};
                    return (
                      <div key={name} style={{
                        background: bg3, borderRadius: 8, padding: "12px 16px", flex: "1 1 0",
                        minWidth: 200, border: `1px solid ${border}`
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: purple, fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" }}>
                          {name}
                        </div>
                        {Object.entries(wc).filter(([k]) => k.includes('success') || k.includes('error')).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>{k.split('.').pop()}</span>
                            <span style={{ fontSize: 9, color: k.includes('error') ? red : green, fontFamily: "monospace", fontWeight: 600 }}>{v}</span>
                          </div>
                        ))}
                        {Object.entries(wh).filter(([k]) => k.includes('latency')).slice(0, 2).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>{k.split('.').pop()} p95</span>
                            <span style={{ fontSize: 9, color: text, fontFamily: "monospace", fontWeight: 600 }}>{v.p95 || '--'}ms</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 6: Memory */}
            <div style={card}>
              <div style={sTitle}>MEMORIA DEL PROCESO</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {metricCard("RSS", fmtBytes(gauges['process.memory.rss']), 'total allocated')}
                {metricCard("Heap Used", fmtBytes(gauges['process.memory.heapUsed']), 'active objects')}
                {metricCard("Heap Total", fmtBytes(gauges['process.memory.heapTotal']), 'reserved')}
                {metricCard("External", fmtBytes(gauges['process.memory.external']), 'C++ objects')}
              </div>
            </div>

            {/* Raw counters */}
            <div style={card}>
              <div style={sTitle}>TODOS LOS CONTADORES</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {Object.entries(counters).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k} style={{
                    display: "flex", justifyContent: "space-between", padding: "6px 10px",
                    background: bg3, borderRadius: 4, border: `1px solid ${border}`
                  }}>
                    <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>{k}</span>
                    <span style={{ fontSize: 10, color: text, fontFamily: "monospace", fontWeight: 600 }}>{v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
}
