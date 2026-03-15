'use client';
import { useState } from 'react';
import { colors, card, sTitle } from '../../lib/theme';

const { purple, muted, amber, red, text, bg3, border, bg2, green } = colors;

export default function GuideTab() {
  const [guideSection, setGuideSection] = useState(0);

  const sectionHeaderStyle = {
    fontSize: 16, fontWeight: 800, color: purple, letterSpacing: "0.02em",
    marginBottom: 16, paddingBottom: 8,
    borderBottom: `2px solid ${purple}`,
    display: "flex", alignItems: "center", gap: 10
  };
  const tableStyle = {
    width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11
  };
  const thStyle = {
    background: "rgba(168,85,247,0.2)", color: purple, fontWeight: 700,
    padding: "8px 12px", textAlign: "left", fontSize: 10,
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderBottom: `1px solid ${border}`
  };
  const tdStyle = (i) => ({
    padding: "7px 12px", borderBottom: `1px solid ${border}`,
    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
    fontSize: 11, lineHeight: 1.5
  });
  const tipBox = {
    background: "rgba(245,158,11,0.08)", borderLeft: `3px solid ${amber}`,
    padding: "10px 14px", borderRadius: "0 6px 6px 0", marginBottom: 14,
    fontSize: 11, lineHeight: 1.6, color: "#fbbf24"
  };
  const alertBox = {
    background: "rgba(239,68,68,0.08)", borderLeft: `3px solid ${red}`,
    padding: "10px 14px", borderRadius: "0 6px 6px 0", marginBottom: 14,
    fontSize: 11, lineHeight: 1.6, color: "#fca5a5"
  };
  const flowBox = {
    background: bg3, border: `1px solid ${border}`, borderRadius: 8,
    padding: 16, fontFamily: "monospace", fontSize: 11,
    lineHeight: 1.8, whiteSpace: "pre-wrap", color: muted
  };

  const sections = [
    { icon: "🧬", title: "Anatomia de una Senal" },
    { icon: "⏱", title: "Barra de Timeframes" },
    { icon: "🎯", title: "Niveles de Operacion" },
    { icon: "🛡", title: "Trailing Stop" },
    { icon: "📊", title: "Derivados" },
    { icon: "🌍", title: "Contexto Macro" },
    { icon: "💪", title: "Fuerza de la Senal" },
    { icon: "⚙", title: "Los 14 Factores" },
    { icon: "📈", title: "Dashboard Macro" },
    { icon: "🔄", title: "Flujo de Decision" },
    { icon: "⚠", title: "Errores Comunes" },
    { icon: "📗", title: "Order Book Depth" },
    { icon: "📉", title: "Dashboard Analytics" },
    { icon: "💰", title: "Paper Trading" },
    { icon: "🧪", title: "Backtesting" },
    { icon: "🔬", title: "Optimizacion" },
    { icon: "🔔", title: "Filtros de Alertas" },
    { icon: "🛡", title: "Risk Engine" },
    { icon: "💼", title: "Portfolio (APM)" },
    { icon: "⚡", title: "Ejecucion" },
    { icon: "🎯", title: "Guia de Uso" },
    { icon: "📐", title: "Parametros" },
    { icon: "📖", title: "Glosario" },
  ];

  const GuideTable = ({ headers, rows }) => (
    <table style={tableStyle}>
      <thead><tr>{headers.map((h, i) => <th key={i} style={thStyle}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, ri) => (
        <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={tdStyle(ri)}>{cell}</td>)}</tr>
      ))}</tbody>
    </table>
  );

  const renderSection = () => {
    switch(guideSection) {
      case 0: return (<div>
        <div style={sectionHeaderStyle}>🧬 1. Anatomia de una Senal</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Cada tarjeta de senal muestra esta informacion de arriba a abajo:</p>
        <div style={{ ...sTitle, marginTop: 10 }}>Encabezado</div>
        <GuideTable headers={["Elemento", "Significado"]} rows={[
          ["🟢 + nombre", "Senal de COMPRA"],
          ["🔴 + nombre", "Senal de VENTA"],
          ["⚪ + nombre", "HOLD (esperar)"],
          ["Precio actual", "Ultimo precio del activo"],
          ["% 24h", "Cambio de precio en las ultimas 24 horas"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Badges (esquina superior derecha)</div>
        <GuideTable headers={["Badge", "Significado"]} rows={[
          [<span style={{color: green, fontWeight: 700}}>CONFLUENCIA FUERTE</span>, "Los 3 timeframes (4H, 1H, 15M) estan de acuerdo"],
          [<span style={{color: amber, fontWeight: 700}}>CONFLUENCIA MODERADA</span>, "2 de 3 timeframes de acuerdo"],
          [<span style={{color: red, fontWeight: 700}}>CONFLICTO</span>, "Los timeframes se contradicen"],
          ["BUY / SELL / HOLD", "La accion recomendada"],
          ["X% confianza", "Que tan seguro esta el motor de la senal"],
          ["Score X/100", "Puntaje general de la senal"],
        ]} />
      </div>);

      case 1: return (<div>
        <div style={sectionHeaderStyle}>⏱ 2. Barra de Timeframes (4H / 1H / 15M)</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Tres bloques que muestran que dice cada temporalidad:</p>
        <GuideTable headers={["Timeframe", "Peso", "Que representa"]} rows={[
          [<span style={{fontWeight: 700}}>4H</span>, "40%", "Tendencia macro. La direccion del mercado en las ultimas horas."],
          [<span style={{fontWeight: 700}}>1H</span>, "40%", "Senal principal. El timeframe donde se genera la senal de trading."],
          [<span style={{fontWeight: 700}}>15M</span>, "20%", "Timing de entrada. Confirma si el momento exacto es bueno para entrar."],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Como interpretarlo</div>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: green, fontWeight: 700, fontSize: 12 }}>● 3/3 de acuerdo</span>
            <span style={{ color: muted, fontSize: 11 }}>— Alta probabilidad. Todas las temporalidades apuntan en la misma direccion.</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: amber, fontWeight: 700, fontSize: 12 }}>● 2/3 de acuerdo</span>
            <span style={{ color: muted, fontSize: 11 }}>— Probabilidad moderada. Entra con menor posicion.</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: red, fontWeight: 700, fontSize: 12 }}>● Conflicto</span>
            <span style={{ color: muted, fontSize: 11 }}>— El mercado esta indeciso. No operes hasta que se aclare.</span>
          </div>
        </div>
        <div style={tipBox}>💡 <strong>Regla de oro:</strong> El 4H es el "gobernador". Si el 4H dice SELL pero 1H y 15M dicen BUY, la senal se debilita automaticamente. Nunca vayas contra la tendencia macro.</div>
      </div>);

      case 2: return (<div>
        <div style={sectionHeaderStyle}>🎯 3. Niveles de Operacion (Trade Levels)</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Este panel solo aparece en senales de BUY o SELL (no en HOLD):</p>
        <GuideTable headers={["Nivel", "Color", "Que significa"]} rows={[
          [<strong>ENTRADA</strong>, <span style={{color: text}}>⬜ Blanco</span>, "Precio al que deberias entrar"],
          [<strong>STOP LOSS</strong>, <span style={{color: red}}>🟥 Rojo</span>, "Precio maximo de perdida. Si llega aqui, vende para proteger tu capital."],
          [<strong>TP1</strong>, <span style={{color: green}}>🟩 Verde</span>, "Primer objetivo de ganancia. Toma al menos 50% de tu posicion aqui."],
          [<strong>TP2</strong>, <span style={{color: green}}>🟩 Verde</span>, "Segundo objetivo (mas ambicioso). Deja correr el resto hasta aqui."],
          [<strong>TRAILING STOP</strong>, <span style={{color: amber}}>🟨 Amarillo</span>, "Stop dinamico que sube con el precio para proteger ganancias."],
          [<strong>ACTIVA EN</strong>, <span style={{color: text}}>⬜ Blanco</span>, "Precio donde se activa el trailing stop (cuando ya tienes ganancia)."],
          [<strong>R:R</strong>, <span style={{color: green}}>Verde/Rojo</span>, "Ratio riesgo/recompensa. Verde si ≥ 1.5, rojo si menor."],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Para una senal de BUY - paso a paso</div>
        <div style={{ ...card, padding: 14 }}>
          {[
            "1. Coloca tu orden de compra en el precio de ENTRADA",
            "2. Inmediatamente coloca un stop-loss en STOP LOSS (proteccion obligatoria)",
            "3. Cuando el precio suba a TP1, vende el 50% de tu posicion (asegura ganancia)",
            "4. Activa el TRAILING STOP cuando el precio alcance el nivel de activacion",
            "5. Deja el 50% restante correr hacia TP2 con el trailing protegiendote"
          ].map((step, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8, borderLeft: i === 0 ? "none" : undefined }}>
              {step}
            </div>
          ))}
        </div>
        <div style={{ ...sTitle, marginTop: 18 }}>Ratio Riesgo/Recompensa (R:R)</div>
        <GuideTable headers={["R:R", "Interpretacion", "Accion"]} rows={[
          ["≥ 2.5", "Excelente", <span style={{color: green}}>Operar con posicion completa</span>],
          ["≥ 1.5", "Aceptable", "Operar normalmente"],
          ["< 1.5", <span style={{color: red, fontWeight: 700}}>Peligroso</span>, <span style={{color: red}}>NO operes. Arriesgas mas de lo que puedes ganar.</span>],
        ]} />
      </div>);

      case 3: return (<div>
        <div style={sectionHeaderStyle}>🛡 4. Trailing Stop - Tu Protector de Ganancias</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>El trailing stop es un stop-loss que se mueve automaticamente a tu favor:</p>
        <GuideTable headers={["Concepto", "Detalle"]} rows={[
          [<strong>Distancia inicial</strong>, "2.5 × ATR (mas ancho que acciones por la volatilidad crypto)"],
          [<strong>Se activa cuando</strong>, "Tu trade tiene 1 ATR de ganancia"],
          [<strong>Paso</strong>, "Sube 1 ATR cada vez que el precio avanza"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Ejemplo practico (BUY en Bitcoin a $100,000)</div>
        <div style={{ ...card, padding: 14, fontFamily: "monospace", fontSize: 11, lineHeight: 2, color: muted }}>
          <div>ATR = $2,000</div>
          <div>Trailing stop inicial: <span style={{color: amber}}>$95,000</span> (100,000 - 2.5 × 2,000)</div>
          <div>Se activa en: <span style={{color: text}}>$102,000</span> (ganancia de 1 ATR)</div>
          <div>BTC sube a $104,000 → trailing sube a <span style={{color: amber}}>$99,000</span></div>
          <div>BTC sube a $108,000 → trailing sube a <span style={{color: amber}}>$103,000</span></div>
          <div>BTC cae a $103,000 → vendes con <span style={{color: green}}>ganancia de $3,000</span></div>
        </div>
        <div style={alertBox}>⚠ <strong>Sin trailing stop:</strong> Muchos traders ven +20% de ganancia y luego el precio se devuelve a 0%. El trailing evita esto.</div>
      </div>);

      case 4: return (<div>
        <div style={sectionHeaderStyle}>📊 5. Derivados (Funding Rate, L/S Ratio)</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Esta fila muestra datos del mercado de futuros de Binance:</p>
        <div style={{ ...sTitle }}>Funding Rate</div>
        <GuideTable headers={["Valor", "Color", "Significado"]} rows={[
          ["> +0.10%", <span style={{color: red}}>🔴</span>, <span style={{color: red}}>Peligro: Demasiados longs apalancados. Probable caida.</span>],
          ["+0.05% a +0.10%", <span style={{color: red}}>🔴</span>, "Cautela: Longs elevados"],
          ["-0.05% a +0.05%", "Normal", "Mercado equilibrado"],
          ["-0.05% a -0.10%", <span style={{color: green}}>🟢</span>, "Oportunidad: Shorts elevados, posible squeeze alcista"],
          ["< -0.10%", <span style={{color: green}}>🟢</span>, <span style={{color: green}}>Shorts extremos: Alta probabilidad de rebote explosivo</span>],
        ]} />
        <div style={tipBox}>💡 <strong>Clave:</strong> El funding rate es una senal <strong>contraria</strong>. Cuando todo el mundo esta long (funding alto positivo), es probable que el precio caiga para liquidarlos.</div>
        <div style={{ ...sTitle, marginTop: 14 }}>Long/Short Ratio</div>
        <GuideTable headers={["Valor", "Significado"]} rows={[
          ["> 2.0", "Longs abrumadores. Riesgo de liquidacion en cascada hacia abajo."],
          ["1.0 - 2.0", "Sesgo alcista moderado"],
          ["0.67 - 1.0", "Equilibrado"],
          ["< 0.5", "Shorts abrumadores. Riesgo de squeeze alcista."],
        ]} />
        <div style={{ ...sTitle, marginTop: 14 }}>Sentimiento</div>
        <GuideTable headers={["Etiqueta", "Significado"]} rows={[
          [<span style={{color: red}}>OVER LEVERAGED LONG</span>, "Exceso de apalancamiento alcista. Cuidado con comprar."],
          [<span style={{color: green}}>OVER LEVERAGED SHORT</span>, "Exceso de apalancamiento bajista. Oportunidad de compra."],
          ["NEUTRAL", "Posicionamiento equilibrado"],
        ]} />
      </div>);

      case 5: return (<div>
        <div style={sectionHeaderStyle}>🌍 6. Contexto Macro (BTC Dominance + DXY)</div>
        <div style={{ ...sTitle }}>BTC Dominance (Dominancia de Bitcoin)</div>
        <GuideTable headers={["Badge", "Color", "Significado", "Que hacer"]} rows={[
          [<span style={{color: green, fontWeight: 700}}>ALT SEASON</span>, <span style={{color: green}}>🟢</span>, "BTC dom baja (<45%). Dinero rotando a altcoins.", "Comprar altcoins."],
          [<span style={{color: red, fontWeight: 700}}>BTC SEASON</span>, <span style={{color: red}}>🔴</span>, "BTC dom alta (>55%). Dinero concentrado en BTC.", "Solo operar BTC. Evitar alts."],
          ["(no aparece)", "—", "Neutral (45-55%)", "Operar normalmente"],
        ]} />
        <div style={alertBox}>🚨 <strong>Regla critica:</strong> Cuando ves "BTC SEASON" en rojo, no compres altcoins aunque la senal diga BUY. Las alts caen 2-3x mas que BTC en estas fases.</div>
        <div style={{ ...sTitle, marginTop: 14 }}>DXY (Indice del Dolar)</div>
        <GuideTable headers={["Badge", "Color", "Significado", "Que hacer"]} rows={[
          [<span style={{color: green, fontWeight: 700}}>DXY RISK ON</span>, <span style={{color: green}}>🟢</span>, "Dolar debil y cayendo. Dinero fluye a crypto.", "Operar con confianza. Macro a favor."],
          [<span style={{color: red, fontWeight: 700}}>DXY RISK OFF</span>, <span style={{color: red}}>🔴</span>, "Dolar fuerte y subiendo. Dinero sale de crypto.", "Reducir exposicion. Macro en contra."],
          ["(no aparece)", "—", "DXY estable", "Operar normalmente"],
        ]} />
        <div style={tipBox}>💡 La correlacion inversa entre DXY y crypto es de ~85%. Cuando el dolar sube fuerte, crypto baja.</div>
      </div>);

      case 6: return (<div>
        <div style={sectionHeaderStyle}>💪 7. Fuerza de la Senal</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Que tan en serio tomar cada senal:</p>
        <GuideTable headers={["Etiqueta", "Score", "Confianza", "Posicion sugerida"]} rows={[
          [<span style={{color: green, fontWeight: 700}}>STRONG BUY</span>, "≥ 75", "≥ 60%", "100% de tu tamano normal"],
          [<span style={{color: green}}>BUY</span>, "≥ 67", "≥ 45%", "75% de tu tamano normal"],
          [<span style={{color: amber}}>WEAK BUY</span>, "≥ 62", "< 45%", "50% o menos"],
          ["HOLD", "38-62", "Cualquiera", <span style={{color: amber, fontWeight: 700}}>No operes. Espera mejor oportunidad.</span>],
          [<span style={{color: amber}}>WEAK SELL</span>, "≤ 38", "< 45%", "Posicion pequena o no compres"],
          [<span style={{color: red}}>SELL</span>, "≤ 33", "≥ 45%", "75% (short o cierra long)"],
          [<span style={{color: red, fontWeight: 700}}>STRONG SELL</span>, "≤ 25", "≥ 60%", "Cierra posiciones long. Protege capital."],
        ]} />
      </div>);

      case 7: return (<div>
        <div style={sectionHeaderStyle}>⚙ 8. Los 14 Factores del Motor de Senales</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Cada senal se genera analizando estos 14 factores:</p>
        <GuideTable headers={["#", "Factor", "Peso max", "Que analiza"]} rows={[
          ["1", <strong>Tendencia EMA</strong>, "±20", "Direccion de medias moviles 9, 21, 50"],
          ["2", <strong>ADX</strong>, "Multi.", "Fuerza de la tendencia (amplifica o reduce)"],
          ["3", <strong>RSI</strong>, "±18", "Sobrecompra/sobreventa"],
          ["4", <strong>MACD</strong>, "±15", "Momentum y cruces de senal"],
          ["5", <strong>Bollinger Bands</strong>, "±10", "Volatilidad y posicion del precio"],
          ["6", <strong>Soporte/Resistencia</strong>, "±8", "Niveles clave de precio"],
          ["7", <strong>Order Book Depth</strong>, "±12", "Paredes de ordenes, imbalance bid/ask"],
          ["8", <strong>Divergencias RSI</strong>, "±20", "Divergencias ocultas (cambios de tendencia)"],
          ["9", <strong>Volumen</strong>, "±10", "Confirmacion o negacion del movimiento"],
          ["10", <strong>Momentum 24h</strong>, "±10", "Fuerza del cambio diario"],
          ["11", <strong>Fear & Greed</strong>, "±3", "Sentimiento extremo (contrarian)"],
          ["12", <strong>Derivados</strong>, "±15", "Funding rate, OI, L/S ratio"],
          ["13", <strong>BTC Dominance</strong>, "±10", "Flujo de capital BTC vs Alts"],
          ["14", <strong>DXY Macro</strong>, "±10", "Fortaleza del dolar (contexto macro global)"],
        ]} />
        <div style={tipBox}>💡 <strong>Order Book Depth</strong> es el factor #7: analiza el libro de ordenes de Binance en tiempo real para detectar paredes de compra/venta significativas y el balance entre presion compradora y vendedora.</div>
      </div>);

      case 8: return (<div>
        <div style={sectionHeaderStyle}>📈 9. Dashboard - Seccion Macro</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>En el dashboard principal veras estas estadisticas:</p>
        <GuideTable headers={["Indicador", "Que es", "Como leerlo"]} rows={[
          [<strong>Fear & Greed</strong>, "Sentimiento del mercado (0-100)", "< 25 = miedo extremo (oportunidad). > 75 = codicia (precaucion)."],
          [<strong>BTC Dominance</strong>, "% del mercado total que es Bitcoin", "> 55% = BTC season. < 45% = alt season."],
          [<strong>DXY (Dollar)</strong>, "Indice de fuerza del dolar", "Rising = bearish crypto. Falling = bullish crypto."],
          [<strong>Total Market Cap</strong>, "Capitalizacion total crypto", "Tendencia general del mercado"],
        ]} />
      </div>);

      case 9: return (<div>
        <div style={sectionHeaderStyle}>🔄 10. Flujo de Decision para Operar</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Sigue este proceso antes de cada trade:</p>
        <div style={flowBox}>{`1. Mira la ACCION (BUY/SELL/HOLD)
   └─ HOLD? → NO OPERES. Espera.
   └─ BUY o SELL? → Continua...

2. Verifica CONFLUENCIA
   └─ Conflicto/Debil? → NO OPERES
   └─ Moderada? → Reduce tamano de posicion a 50%
   └─ Fuerte? → Posicion normal. Continua...

3. Revisa R:R (Riesgo/Recompensa)
   └─ < 1.5? → NO OPERES. No vale la pena.
   └─ ≥ 1.5? → Continua...

4. Chequea DERIVADOS
   └─ Funding > +0.10%? → Cuidado con BUY
   └─ Funding < -0.10%? → Cuidado con SELL
   └─ Normal? → Continua...

5. Revisa MACRO
   └─ BTC SEASON + operando alt? → NO COMPRES
   └─ DXY RISK OFF? → Reduce exposicion
   └─ Todo OK? → Continua...

6. EJECUTA
   ✓ Compra/vende en precio de ENTRADA
   ✓ Coloca STOP LOSS inmediatamente
   ✓ Programa TP1 (vende 50%)
   ✓ Activa TRAILING STOP en el nivel indicado
   ✓ Deja correr el resto hacia TP2`}</div>
      </div>);

      case 10: return (<div>
        <div style={sectionHeaderStyle}>⚠ 11. Errores Comunes a Evitar</div>
        <GuideTable headers={["Error", "Por que es peligroso", "Que hacer"]} rows={[
          [<strong>Operar sin stop-loss</strong>, "Una sola caida puede destruir tu cuenta", <span style={{color: green}}>Siempre usa el SL que indica la senal</span>],
          [<strong>Ignorar R:R {'<'} 1.5</strong>, "Arriesgas mas de lo que puedes ganar", "Si es rojo, no operes"],
          [<strong>Comprar alts en BTC SEASON</strong>, "Las alts caen 2-3x mas que BTC", "Solo opera BTC con badge rojo"],
          [<strong>Ignorar confluencia en conflicto</strong>, "Los timeframes se contradicen", "Espera a que se alineen"],
          [<strong>No tomar ganancias en TP1</strong>, "El precio puede devolverse a 0%", "Siempre vende al menos 50% en TP1"],
          [<strong>WEAK BUY como STRONG</strong>, "Son senales muy diferentes en fiabilidad", "Reduce posicion o espera mejor senal"],
          [<strong>Ignorar funding rate extremo</strong>, "Las liquidaciones masivas causan crashes", "Si funding > 0.10%, no compres"],
        ]} />
      </div>);

      case 11: return (<div>
        <div style={sectionHeaderStyle}>📗 12. Order Book Depth</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>El Order Book Depth analiza el libro de ordenes de Binance en tiempo real para detectar presion de compra/venta institucional.</p>
        <div style={{ ...sTitle }}>Que muestra cada senal</div>
        <GuideTable headers={["Elemento", "Significado"]} rows={[
          [<strong>Bid Wall</strong>, "Pared de compra grande. Soporte fuerte donde hay muchas ordenes de compra acumuladas."],
          [<strong>Ask Wall</strong>, "Pared de venta grande. Resistencia donde hay muchas ordenes de venta acumuladas."],
          [<strong>Imbalance</strong>, "Ratio entre presion compradora y vendedora. > 1.5 = mas compradores. < 0.67 = mas vendedores."],
          [<strong>Profundidad %</strong>, "Analiza el 2% del spread cercano al precio actual."],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Como interpretar el Imbalance</div>
        <GuideTable headers={["Imbalance", "Color", "Significado"]} rows={[
          ["> 2.0", <span style={{color: green}}>🟢 Verde</span>, "Fuerte presion compradora. Refuerza senales BUY."],
          ["1.5 - 2.0", <span style={{color: green}}>🟢 Verde claro</span>, "Presion compradora moderada."],
          ["0.67 - 1.5", <span style={{color: muted}}>⚪ Gris</span>, "Equilibrado. Sin sesgo claro."],
          ["0.5 - 0.67", <span style={{color: red}}>🔴 Rojo claro</span>, "Presion vendedora moderada."],
          ["< 0.5", <span style={{color: red}}>🔴 Rojo</span>, "Fuerte presion vendedora. Refuerza senales SELL."],
        ]} />
        <div style={tipBox}>💡 <strong>Clave:</strong> Las paredes de ordenes grandes pueden actuar como soporte/resistencia temporal. Si ves una Bid Wall de $5M debajo del precio, es dificil que el precio baje mas alla de ese nivel.</div>
        <div style={alertBox}>⚠ <strong>Ojo:</strong> Las paredes pueden ser "fake" (spoofing). Si una pared desaparece rapidamente, no confies en ella. Las paredes que persisten varios minutos son mas confiables.</div>
      </div>);

      case 12: return (<div>
        <div style={sectionHeaderStyle}>📉 13. Dashboard Analytics</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>El Dashboard incluye 4 graficos interactivos que te ayudan a analizar el rendimiento de tu trading:</p>
        <div style={{ ...sTitle }}>Graficos disponibles</div>
        <GuideTable headers={["Grafico", "Que muestra", "Cuando aparece"]} rows={[
          [<strong>Curva de Equity</strong>, "Evolucion de tu capital en Paper Trading a lo largo del tiempo.", "Cuando tienes al menos 2 trades cerrados."],
          [<strong>P&L Diario</strong>, "Ganancia o perdida de cada dia en barras verdes/rojas.", "Cuando tienes trades cerrados."],
          [<strong>Rendimiento por Activo</strong>, "Wins vs Losses por cada criptomoneda operada.", "Cuando tienes trades cerrados."],
          [<strong>Backtest Equity Curve</strong>, "Curva de equity del ultimo backtest completado.", "Cuando hay un backtest completado."],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Como interpretar la Curva de Equity</div>
        <div style={{ ...card, padding: 14 }}>
          {[
            "Linea ascendente constante = estrategia consistente",
            "Drawdowns profundos = posiciones demasiado grandes o stops mal ubicados",
            "Linea de referencia = tu capital inicial (si estas debajo, estas en perdida)",
            "Tooltip muestra equity exacta y % de drawdown desde el maximo"
          ].map((item, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>• {item}</div>
          ))}
        </div>
        <div style={tipBox}>💡 <strong>Consejo:</strong> Usa el P&L Diario para identificar que dias de la semana operas mejor. Muchos traders descubren que operan peor los lunes y viernes.</div>
      </div>);

      case 13: return (<div>
        <div style={sectionHeaderStyle}>💰 14. Paper Trading (Trading Simulado)</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Paper Trading te permite practicar con dinero virtual siguiendo las senales del sistema. Sin riesgo real.</p>
        <div style={{ ...sTitle }}>Configuracion</div>
        <GuideTable headers={["Parametro", "Default", "Descripcion"]} rows={[
          [<strong>Capital inicial</strong>, "$10,000", "Capital virtual con el que empiezas"],
          [<strong>Max posiciones</strong>, "5", "Maximo de trades abiertos simultaneamente"],
          [<strong>Riesgo por trade</strong>, "2%", "Porcentaje del capital arriesgado por operacion"],
          [<strong>Min confluencia</strong>, "2", "Minimo de timeframes que deben coincidir"],
          [<strong>Min R:R</strong>, "1.5", "Ratio minimo riesgo/recompensa para entrar"],
          [<strong>Senales permitidas</strong>, "STRONG BUY/SELL", "Que tipos de senales activan trades"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Como funciona</div>
        <div style={{ ...card, padding: 14 }}>
          {[
            "1. Activa Paper Trading en la pestana Paper → Config",
            "2. El sistema abre trades automaticamente segun tus filtros de senales",
            "3. Los trades usan Stop Loss y Take Profit calculados por el motor de senales",
            "4. Las posiciones se cierran automaticamente cuando tocan SL, TP1 o TP2",
            "5. Revisa tus metricas en tiempo real: Win Rate, P&L, Sharpe Ratio",
            "6. Analiza el historial completo de trades cerrados con todos los detalles"
          ].map((step, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>{step}</div>
          ))}
        </div>
        <div style={{ ...sTitle, marginTop: 18 }}>Metricas clave</div>
        <GuideTable headers={["Metrica", "Que significa", "Valor ideal"]} rows={[
          [<strong>Win Rate</strong>, "% de trades ganadores", "> 50%"],
          [<strong>Total P&L</strong>, "Ganancia/perdida total acumulada", "Positivo y creciente"],
          [<strong>Avg Win / Avg Loss</strong>, "Promedio de ganancias vs perdidas", "Avg Win > Avg Loss"],
          [<strong>Sharpe Ratio</strong>, "Retorno ajustado por riesgo", "> 1.0 (bueno), > 2.0 (excelente)"],
          [<strong>Max Drawdown</strong>, "Maxima caida desde el pico", "< 20% idealmente"],
          [<strong>Profit Factor</strong>, "Total ganancias / Total perdidas", "> 1.5"],
        ]} />
        <div style={alertBox}>⚠ <strong>Importante:</strong> Opera en Paper Trading al menos 2-4 semanas antes de arriesgar dinero real. Esto te permite conocer el sistema y ajustar los parametros a tu estilo.</div>
      </div>);

      case 14: return (<div>
        <div style={sectionHeaderStyle}>🧪 15. Backtesting</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>El Backtesting simula como habrian funcionado las senales del motor en datos historicos reales.</p>
        <div style={{ ...sTitle }}>Parametros de configuracion</div>
        <GuideTable headers={["Parametro", "Descripcion", "Recomendacion"]} rows={[
          [<strong>Asset</strong>, "Criptomoneda a testear", "Empieza con Bitcoin"],
          [<strong>Dias</strong>, "Periodo historico a analizar", "90 dias minimo para resultados significativos"],
          [<strong>Capital</strong>, "Capital inicial simulado", "$10,000 es buen punto de partida"],
          [<strong>Riesgo por trade</strong>, "% del capital por operacion", "1-3% (2% es estandar)"],
          [<strong>Min confluencia</strong>, "Minimo de TFs alineados", "2 para mas trades, 3 para mas calidad"],
          [<strong>Min R:R</strong>, "Ratio minimo riesgo/recompensa", "1.5 estandar, 2.0 para mayor selectividad"],
          [<strong>Step interval</strong>, "Granularidad de la simulacion", "4h para balance entre detalle y velocidad"],
          [<strong>Senales permitidas</strong>, "STRONG BUY, BUY, STRONG SELL, etc.", "Solo STRONG para maxima calidad"],
          [<strong>Cooldown bars</strong>, "Barras de espera entre trades", "6 para evitar sobre-operar"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Como interpretar resultados</div>
        <div style={{ ...card, padding: 14 }}>
          {[
            "Total Return: Rendimiento total del periodo (busca > 0%)",
            "Win Rate: % de trades ganadores (busca > 45%)",
            "Sharpe Ratio: Rendimiento ajustado por riesgo (busca > 1.0)",
            "Max Drawdown: Peor caida (busca < 25%)",
            "Equity Curve: Deberia ser generalmente ascendente",
            "Cada trade muestra: activo, direccion, entrada, salida, P&L, duracion"
          ].map((item, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>• {item}</div>
          ))}
        </div>
        <div style={tipBox}>💡 <strong>Consejo:</strong> Ejecuta el mismo backtest con diferentes parametros para encontrar la combinacion optima. Luego usa el Optimizador para automatizar este proceso.</div>
        <div style={alertBox}>⚠ <strong>Cuidado con el overfitting:</strong> Si tus resultados son &quot;demasiado buenos&quot; ({'>'} 200% en 30 dias), probablemente los parametros estan sobre-ajustados a datos pasados y no funcionaran en el futuro.</div>
      </div>);

      case 15: return (<div>
        <div style={sectionHeaderStyle}>🔬 16. Optimizacion de Estrategia</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>El Optimizador prueba automaticamente cientos de combinaciones de un parametro del motor de senales para encontrar el valor optimo.</p>
        <div style={{ ...sTitle }}>Parametros optimizables</div>
        <GuideTable headers={["Parametro", "Que controla", "Rango tipico"]} rows={[
          [<strong>rsiPeriod</strong>, "Periodo del RSI", "7-21"],
          [<strong>rsiOverbought</strong>, "Nivel de sobrecompra RSI", "65-80"],
          [<strong>rsiOversold</strong>, "Nivel de sobreventa RSI", "20-35"],
          [<strong>emaPeriods</strong>, "Periodos de las EMAs", "Varios"],
          [<strong>macdFast/Slow/Signal</strong>, "Parametros del MACD", "Varios"],
          [<strong>bollingerPeriod</strong>, "Periodo de Bollinger Bands", "15-25"],
          [<strong>bollingerStdDev</strong>, "Desviacion estandar BB", "1.5-3.0"],
          [<strong>atrPeriod</strong>, "Periodo del ATR", "10-20"],
          [<strong>volumeThreshold</strong>, "Umbral de volumen", "1.0-3.0"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Como funciona</div>
        <div style={flowBox}>{`1. Selecciona el ACTIVO a optimizar (ej: bitcoin)
2. Selecciona el PARAMETRO a optimizar (ej: rsiPeriod)
3. Define el periodo de datos (dias)
4. Click en "Optimizar"

El sistema:
  → Genera una grilla de valores para el parametro
  → Ejecuta un backtest completo por cada valor
  → Compara resultados por Sharpe Ratio y Return
  → Te muestra el MEJOR valor encontrado

5. Revisa los resultados ordenados
6. Aplica el mejor valor a tu configuracion`}</div>
        <div style={tipBox}>💡 <strong>Flujo recomendado:</strong> Optimiza → Backtest con valores optimos → Paper Trade 2 semanas → Si funciona, opera en real.</div>
        <div style={alertBox}>⚠ <strong>No optimices todo a la vez.</strong> Optimiza un parametro, fija el mejor valor, luego optimiza el siguiente. Optimizar todos juntos puede crear resultados irreales.</div>
      </div>);

      case 16: return (<div>
        <div style={sectionHeaderStyle}>🔔 17. Filtros de Alertas Personalizados</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Configura que alertas de Telegram recibes mediante filtros avanzados basados en condiciones de las senales.</p>
        <div style={{ ...sTitle }}>Tipos de condiciones</div>
        <GuideTable headers={["Campo", "Operadores", "Ejemplo"]} rows={[
          [<strong>score</strong>, "> , < , >= , <=", "score > 75 (solo senales con score alto)"],
          [<strong>confidence</strong>, "> , < , >= , <=", "confidence >= 60 (alta confianza)"],
          [<strong>strength</strong>, "= , !=", "strength = STRONG BUY"],
          [<strong>action</strong>, "= , !=", "action != HOLD (excluir holds)"],
          [<strong>asset</strong>, "= , in", "asset in bitcoin,ethereum"],
          [<strong>riskReward</strong>, "> , >= , <", "riskReward >= 2.0"],
          [<strong>confluence</strong>, "= , >=", "confluence >= 2"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Logica de condiciones</div>
        <div style={{ ...card, padding: 14 }}>
          {[
            "AND: Todas las condiciones deben cumplirse (mas restrictivo)",
            "OR: Al menos una condicion debe cumplirse (mas permisivo)",
            "Puedes combinar multiples condiciones por filtro",
            "Multiples filtros se evaluan independientemente"
          ].map((item, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>• {item}</div>
          ))}
        </div>
        <div style={{ ...sTitle, marginTop: 18 }}>Ejemplos de filtros utiles</div>
        <GuideTable headers={["Nombre", "Condiciones", "Para que"]} rows={[
          [<strong>Solo senales fuertes</strong>, "strength = STRONG BUY OR strength = STRONG SELL", "Recibir solo las mejores oportunidades"],
          [<strong>Bitcoin premium</strong>, "asset = bitcoin AND score > 70", "Solo alertas de BTC con alto score"],
          [<strong>Alto R:R</strong>, "riskReward >= 2.5 AND confluence >= 2", "Trades con excelente ratio riesgo/recompensa"],
          [<strong>Excluir holds</strong>, "action != HOLD", "No recibir alertas de HOLD (esperar)"],
        ]} />
        <div style={tipBox}>💡 <strong>Consejo:</strong> Empieza con filtros amplios y ve restringiendolos. Si no recibes alertas en 24h, tus filtros son demasiado estrictos.</div>
      </div>);

      case 17: return (<div>
        <div style={sectionHeaderStyle}>🛡 18. Risk Engine y Seguridad</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>El Risk Engine valida cada trade antes de ejecutarlo con 7 capas de seguridad:</p>
        <GuideTable headers={["#", "Validacion", "Que verifica"]} rows={[
          ["1", "Trading habilitado", "Que no este pausado o con kill switch activo"],
          ["2", "Limites de seguridad", "Perdida diaria, cantidad de posiciones, cooldown"],
          ["3", "Trade duplicado", "Solo una posicion abierta por activo"],
          ["4", "Limites de portafolio", "Correlacion, exposicion por sector, misma direccion"],
          ["5", "Tamano de posicion", "No excede el max % del capital"],
          ["6", "Drawdown Circuit Breaker", "Rolling 90 dias no excede 15%"],
          ["7", "Kill Switch", "Verificacion final de emergencia"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Drawdown Circuit Breaker</div>
        <div style={{ ...card, padding: 14 }}>
          {[
            "Monitorea drawdown en ventana rolling de 90 dias",
            "Umbral: 15% - si se excede, bloquea nuevos trades",
            "Se recupera automaticamente cuando equity sube",
            "Usa equity snapshots diarios para calculo preciso"
          ].map((item, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>• {item}</div>
          ))}
        </div>
        <div style={{ ...sTitle, marginTop: 18 }}>Kill Switch (Emergencia)</div>
        <GuideTable headers={["Accion", "Efecto"]} rows={[
          ["Activar", "Congela nuevas ordenes + cierra todas las posiciones abiertas"],
          ["Desactivar", "Restaura trading normal (manual)"],
          ["Audit", "Toda activacion queda registrada en el log"],
        ]} />
        <div style={alertBox}>⚠ <strong>Kill Switch:</strong> Usalo solo en emergencias: flash crashes, hackeos de exchanges, o comportamiento anomalo del sistema.</div>
        <div style={{ ...sTitle, marginTop: 18 }}>Limites de Portafolio</div>
        <GuideTable headers={["Limite", "Valor", "Proposito"]} rows={[
          ["Max correlacion", "0.70", "Bloquea entradas correlacionadas (ej: BTC+ETH juntos)"],
          ["Max exposicion sector", "60%", "Evita concentracion excesiva"],
          ["Max misma direccion", "3 posiciones", "Limita riesgo direccional"],
        ]} />
      </div>);

      case 18: return (<div>
        <div style={sectionHeaderStyle}>💼 19. Portfolio Management (APM)</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Gestion avanzada de portafolio multi-wallet con vista consolidada.</p>
        <div style={{ ...sTitle }}>Wallets Soportados (17 proveedores)</div>
        <GuideTable headers={["Tipo", "Proveedores"]} rows={[
          [<strong>Exchanges</strong>, "Binance, Bybit, Coinbase, Kraken, OKX, Kucoin"],
          [<strong>LATAM</strong>, "Mercadopago, Skipo, Lemon, Ripio"],
          [<strong>Hot Wallets</strong>, "Metamask, Trust Wallet, Phantom, Exodus"],
          [<strong>Cold Storage</strong>, "Ledger, Trezor"],
          [<strong>Otro</strong>, "Custom (cualquier wallet)"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Funcionalidades</div>
        <div style={{ ...card, padding: 14 }}>
          {[
            "Crear multiples wallets con nombre, color y notas",
            "Cargar holdings via CSV batch upload",
            "Vista consolidada con precios en tiempo real",
            "P&L por activo y por wallet",
            "Total portfolio value actualizado en tiempo real"
          ].map((item, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>• {item}</div>
          ))}
        </div>
        <div style={{ ...sTitle, marginTop: 18 }}>Formato CSV para Upload</div>
        <GuideTable headers={["Columna", "Obligatoria", "Ejemplo"]} rows={[
          ["asset", "Si", "bitcoin, ethereum, solana"],
          ["amount", "Si", "0.5, 10.25"],
          ["buy_price", "Si", "65000, 3200"],
          ["date", "No", "2024-01-15"],
          ["wallet", "No", "binance, ledger"],
        ]} />
      </div>);

      case 19: return (<div>
        <div style={sectionHeaderStyle}>⚡ 20. Sistema de Ejecucion</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Ciclo de vida completo de ordenes con validacion y audit trail.</p>
        <div style={{ ...sTitle }}>Ciclo de Vida de una Orden</div>
        <GuideTable headers={["Estado", "Significado"]} rows={[
          [<span style={{color: amber}}>PENDING</span>, "Orden creada, esperando validacion del Risk Engine"],
          [<span style={{color: green}}>VALIDATED</span>, "Paso todas las validaciones, lista para enviar"],
          [<span style={{color: purple}}>SUBMITTED</span>, "Enviada al exchange/paper para ejecucion"],
          [<span style={{color: amber}}>PARTIAL_FILL</span>, "Parcialmente ejecutada en el mercado"],
          [<span style={{color: green}}>FILLED</span>, "Completamente ejecutada"],
          [<span style={{color: muted}}>CANCELLED</span>, "Cancelada por el usuario"],
          [<span style={{color: red}}>REJECTED</span>, "Rechazada por el Risk Engine"],
          [<span style={{color: muted}}>EXPIRED</span>, "Tiempo de validez expirado"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Costos de Ejecucion (Modelo Realista)</div>
        <GuideTable headers={["Activo", "Slippage", "Comision"]} rows={[
          ["Bitcoin (BTC)", "0.05%", "0.10%"],
          ["Ethereum (ETH)", "0.08%", "0.10%"],
          ["Altcoins mayores", "0.15%", "0.10%"],
          ["Altcoins menores", "0.25%", "0.15%"],
        ]} />
        <div style={tipBox}>💡 El backtester y paper trading incluyen estos costos automaticamente para resultados realistas. Ademas hay 2% de probabilidad de gap risk por trade.</div>
        <div style={{ ...sTitle, marginTop: 18 }}>Adaptadores</div>
        <GuideTable headers={["Adaptador", "Uso"]} rows={[
          [<strong>Paper</strong>, "Simulacion sin riesgo (paper trading, backtesting)"],
          [<strong>Bybit</strong>, "Trading real Spot (testnet por defecto para seguridad)"],
        ]} />
      </div>);

      case 20: return (<div>
        <div style={sectionHeaderStyle}>🎯 21. Guia de Uso: Mejores Resultados</div>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Sigue estos pasos para sacar el maximo provecho de Sentix Pro:</p>
        <div style={{ ...sTitle }}>Fase 1: Configuracion (Dia 1)</div>
        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          {[
            "1. Familiarizate con el Dashboard: macro, senales, salud del sistema",
            "2. Configura alertas conservadoras: confianza >= 60%, solo STRONG, cooldown 30min",
            "3. Configura Paper Trading: capital real, riesgo 2%, confluencia 3, solo STRONG"
          ].map((step, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>{step}</div>
          ))}
        </div>
        <div style={{ ...sTitle }}>Fase 2: Paper Trading (Semanas 1-4)</div>
        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          {[
            "4. Activa paper trading automatico por 2-4 semanas",
            "5. NO cambies parametros las primeras 2 semanas",
            "6. Revisa diariamente: Win Rate, P&L, Max Drawdown",
            "7. Objetivo: Win Rate > 50%, Profit Factor > 1.2"
          ].map((step, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>{step}</div>
          ))}
        </div>
        <div style={{ ...sTitle }}>Fase 3: Optimizacion (Semanas 3-4)</div>
        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          {[
            "8. Backtest con 90+ dias, empieza con BTC",
            "9. Optimiza en orden: buyThreshold > atrTrailing > rsiOversold > confluence > riskPerTrade",
            "10. Valida con Monte Carlo (5to percentil positivo = robusto)",
            "11. Fija mejores valores y re-backtest para confirmar"
          ].map((step, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>{step}</div>
          ))}
        </div>
        <div style={{ ...sTitle }}>Fase 4: Trading Real (Mes 2+)</div>
        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          {[
            "12. Configura wallets en APM, carga holdings via CSV",
            "13. Empieza con riesgo 1% (menor que paper)",
            "14. Sigue SIEMPRE el Flujo de Decision (seccion 10)",
            "15. Cada mes: re-backtest 90 dias, re-optimiza si Sharpe < 1.0"
          ].map((step, i) => (
            <div key={i} style={{ color: muted, fontSize: 11, lineHeight: 1.8, paddingLeft: 8 }}>{step}</div>
          ))}
        </div>
        <div style={alertBox}>⚠ <strong>Reglas de oro:</strong> Nunca sin stop-loss. Siempre 50% en TP1. No operes alts en BTC SEASON. Si pierdes 3 seguidos, para y analiza. Usa Kill Switch si algo esta mal.</div>
      </div>);

      case 21: return (<div>
        <div style={sectionHeaderStyle}>📐 22. Parametros Recomendados por Perfil</div>
        <div style={{ ...sTitle }}>Conservador (principiante)</div>
        <GuideTable headers={["Parametro", "Valor", "Razon"]} rows={[
          ["Riesgo por trade", "1%", "Minimiza perdidas mientras aprendes"],
          ["Max posiciones", "2", "Menos riesgo total"],
          ["Confluencia", "3", "Solo con todos los TFs alineados"],
          ["Senales", "Solo STRONG", "Maxima calidad"],
          ["Cooldown", "60 min", "Evita sobre-operar"],
          ["Confianza min", "60%", "Alta conviccion"],
          ["Kelly", "Desactivado", "Riesgo fijo"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Moderado (intermedio)</div>
        <GuideTable headers={["Parametro", "Valor", "Razon"]} rows={[
          ["Riesgo por trade", "2%", "Balance crecimiento/seguridad"],
          ["Max posiciones", "3-4", "Diversificacion moderada"],
          ["Confluencia", "2", "Mas oportunidades"],
          ["Senales", "STRONG + BUY/SELL", "Mayor frecuencia"],
          ["Cooldown", "30 min", "Equilibrio"],
          ["Confianza min", "50%", "Conviccion decente"],
          ["Kelly", "Quarter (0.25)", "Sizing adaptativo"],
        ]} />
        <div style={{ ...sTitle, marginTop: 18 }}>Agresivo (avanzado)</div>
        <GuideTable headers={["Parametro", "Valor", "Razon"]} rows={[
          ["Riesgo por trade", "3-5%", "Mayor rendimiento potencial"],
          ["Max posiciones", "5", "Maximo diversificacion"],
          ["Confluencia", "2", "Mas oportunidades"],
          ["Senales", "Todas incl. WEAK", "Maxima frecuencia"],
          ["Cooldown", "15 min", "Mas trades"],
          ["Confianza min", "40%", "Conviccion moderada"],
          ["Kelly", "Half (0.50)", "Sizing agresivo controlado"],
        ]} />
        <div style={alertBox}>⚠ El perfil agresivo requiere experiencia y capital que puedas perder. No uses si eres nuevo.</div>
      </div>);

      case 22: return (<div>
        <div style={sectionHeaderStyle}>📖 23. Glosario Rapido</div>
        <GuideTable headers={["Termino", "Significado"]} rows={[
          [<strong>ATR</strong>, "Average True Range. Mide la volatilidad tipica del activo."],
          [<strong>RSI</strong>, "Relative Strength Index. Sobrecompra (>70) y sobreventa (<30)."],
          [<strong>MACD</strong>, "Indicador de momentum. Cruces indican cambios de tendencia."],
          [<strong>EMA</strong>, "Media movil exponencial. 9 > 21 > 50 = tendencia alcista."],
          [<strong>Bollinger Bands</strong>, "Bandas de volatilidad. Precio fuera = movimiento extremo."],
          [<strong>ADX</strong>, "Mide fuerza de tendencia. > 30 = fuerte. < 20 = sin tendencia."],
          [<strong>Order Book</strong>, "Libro de ordenes. Muestra todas las ordenes de compra/venta pendientes."],
          [<strong>Imbalance</strong>, "Desbalance entre ordenes de compra y venta en el order book."],
          [<strong>Funding Rate</strong>, "Tasa que pagan longs a shorts (o viceversa) cada 8 horas."],
          [<strong>OI</strong>, "Open Interest. Total de posiciones abiertas en futuros."],
          [<strong>L/S Ratio</strong>, "Proporcion de longs vs shorts en el mercado."],
          [<strong>DXY</strong>, "Indice del dolar americano contra una canasta de monedas."],
          [<strong>Trailing Stop</strong>, "Stop-loss que se mueve automaticamente a tu favor."],
          [<strong>R:R</strong>, "Risk/Reward. Cuanto puedes ganar vs cuanto puedes perder."],
          [<strong>Confluence</strong>, "Cuando multiples timeframes estan de acuerdo en la direccion."],
          [<strong>Paper Trading</strong>, "Trading simulado con dinero virtual para practicar."],
          [<strong>Backtesting</strong>, "Simular una estrategia en datos historicos reales."],
          [<strong>Sharpe Ratio</strong>, "Rendimiento ajustado por riesgo. > 1 es bueno, > 2 excelente."],
          [<strong>Drawdown</strong>, "Caida desde el punto mas alto del capital."],
          [<strong>Profit Factor</strong>, "Total de ganancias dividido entre total de perdidas."],
          [<strong>Overfitting</strong>, "Cuando los parametros se ajustan demasiado a datos pasados."],
          [<strong>Walk-Forward</strong>, "Validacion que divide datos en periodos de entrenamiento y prueba."],
          [<strong>Monte Carlo</strong>, "Analisis que reordena trades 1000x para medir robustez estadistica."],
          [<strong>Kelly Criterion</strong>, "Formula matematica para calcular tamano optimo de posicion."],
          [<strong>Kill Switch</strong>, "Interruptor de emergencia que detiene todo el trading."],
          [<strong>Circuit Breaker</strong>, "Bloquea trading cuando drawdown excede umbral (15%, 90 dias)."],
          [<strong>TTL</strong>, "Time-to-Live. Senal expira en 15 min, decae -5% confianza/min."],
          [<strong>Market Regime</strong>, "Estado del mercado: trending, ranging o volatile."],
          [<strong>Auto-Tuner</strong>, "Optimizacion automatica de parametros con aprobacion Telegram."],
          [<strong>APM</strong>, "Advanced Portfolio Management. Multi-wallet con 17 proveedores."],
        ]} />
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: muted, fontFamily: "monospace" }}>
          Sentix Pro v6.0 · Motor de 14 factores · Multi-timeframe · Order Book · Risk Engine · Kelly · Monte Carlo
        </div>
      </div>);

      default: return null;
    }
  };

  return (
    <div>
      {/* Guide Header */}
      <div style={{
        ...card,
        background: `linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.08))`,
        border: `1px solid rgba(168,85,247,0.3)`,
        textAlign: "center", padding: "24px 20px"
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.02em" }}>
          GUIA COMPLETA DE SENALES
        </div>
        <div style={{ fontSize: 11, color: muted, marginTop: 6, lineHeight: 1.5 }}>
          Como interpretar y utilizar las senales de Sentix Pro para un trading efectivo
        </div>
        <div style={{
          display: "inline-block", marginTop: 10, padding: "4px 12px",
          background: "rgba(168,85,247,0.2)", borderRadius: 20,
          fontSize: 10, color: purple, fontWeight: 700
        }}>
          v6.0 · 14 Factores · Risk Engine · Kelly · Monte Carlo
        </div>
      </div>

      {/* Section Navigation */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {sections.map((sec, i) => (
          <button
            key={i}
            onClick={() => setGuideSection(i)}
            style={{
              padding: "6px 12px",
              background: guideSection === i ? `linear-gradient(135deg, ${purple}, #7c3aed)` : bg3,
              border: guideSection === i ? "none" : `1px solid ${border}`,
              borderRadius: 6,
              color: guideSection === i ? "#fff" : muted,
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: guideSection === i ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {sec.icon} {sec.title}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div style={{ ...card, padding: "20px 24px" }}>
        {renderSection()}
      </div>

      {/* Navigation arrows */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <button
          onClick={() => setGuideSection(Math.max(0, guideSection - 1))}
          disabled={guideSection === 0}
          style={{
            padding: "8px 16px", background: bg3, border: `1px solid ${border}`,
            borderRadius: 6, color: guideSection === 0 ? muted : text,
            fontFamily: "monospace", fontSize: 11, cursor: guideSection === 0 ? "default" : "pointer",
            opacity: guideSection === 0 ? 0.4 : 1
          }}
        >
          ← Anterior
        </button>
        <span style={{ fontSize: 10, color: muted, fontFamily: "monospace", alignSelf: "center" }}>
          {guideSection + 1} / {sections.length}
        </span>
        <button
          onClick={() => setGuideSection(Math.min(sections.length - 1, guideSection + 1))}
          disabled={guideSection === sections.length - 1}
          style={{
            padding: "8px 16px", background: bg3, border: `1px solid ${border}`,
            borderRadius: 6, color: guideSection === sections.length - 1 ? muted : text,
            fontFamily: "monospace", fontSize: 11, cursor: guideSection === sections.length - 1 ? "default" : "pointer",
            opacity: guideSection === sections.length - 1 ? 0.4 : 1
          }}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
