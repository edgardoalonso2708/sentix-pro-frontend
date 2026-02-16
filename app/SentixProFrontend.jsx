'use client'

import { useState, useCallback, useEffect } from "react";

export default function SentixProFrontend() {
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchMarketData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/market`);
      const data = await response.json();
      setMarketData(data);
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  }, [API_URL]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchMarketData();
      setLoading(false);
    };
    loadData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  const bg = "#0a0a0a";
  const bg2 = "#111111";
  const border = "rgba(255,255,255,0.08)";
  const text = "#f9fafb";
  const muted = "#6b7280";
  const purple = "#a855f7";

  if (loading) {
    return (
      <div style={{
        fontFamily: "'Inter', sans-serif",
        background: bg,
        minHeight: "100vh",
        color: text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>◈</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Cargando SENTIX Pro...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: bg,
      minHeight: "100vh",
      color: text,
      padding: 20
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingBottom: 18,
          marginBottom: 24,
          borderBottom: `1px solid ${border}`
        }}>
          <div style={{
            width: 42,
            height: 42,
            border: `2px solid ${purple}`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: purple,
            fontWeight: 700
          }}>◈</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              SENTIX <span style={{ fontSize: 12, color: purple }}>PRO</span>
            </div>
            <div style={{ fontSize: 10, color: muted }}>Real-time Trading System</div>
          </div>
        </div>

        <div style={{
          background: bg2,
          border: `1px solid ${border}`,
          borderRadius: 10,
          padding: "20px",
          marginBottom: 20
        }}>
          <h2 style={{ margin: 0, marginBottom: 10, color: purple }}>
            🎉 SENTIX Pro Conectado!
          </h2>
          <p style={{ margin: 0, fontSize: 14 }}>
            Frontend funcionando. 
            {marketData ? ' ✅ Backend conectado' : ' ⏳ Conectando...'}
          </p>
          {marketData && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: muted, marginBottom: 8 }}>
                📊 DATOS DE MERCADO
              </div>
              <div style={{ 
                background: "#1a1a1a", 
                padding: 10, 
                borderRadius: 6, 
                fontSize: 11,
                fontFamily: "monospace",
                color: "#00d4aa"
              }}>
                • Fear & Greed: {marketData.macro?.fearGreed}/100<br/>
                • BTC Dom: {marketData.macro?.btcDom}%<br/>
                • Cryptos: {Object.keys(marketData.crypto || {}).length}
              </div>
            </div>
          )}
        </div>

        <div style={{
          textAlign: "center",
          fontSize: 10,
          color: muted,
          padding: "16px 0",
          borderTop: `1px solid ${border}`
        }}>
          SENTIX PRO v1.0 · Real-time Trading System
        </div>
      </div>
    </div>
  );
}