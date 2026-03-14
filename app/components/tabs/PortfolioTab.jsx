'use client';
import { colors, card, sTitle } from '../../lib/theme';
import { formatPrice, formatLargeNumber } from '../../lib/utils';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

export default function PortfolioTab({
  portfolio, wallets, marketData, portfolioLoading, walletsLoading,
  showAddForm, setShowAddForm,
  showBatchUpload, setShowBatchUpload,
  showCreateWallet, setShowCreateWallet,
  uploadStatus, setUploadStatus,
  uploading, setUploading,
  saving, setSaving,
  selectedWalletFilter, setSelectedWalletFilter,
  newPosition, setNewPosition,
  newWallet, setNewWallet,
  uploadWalletId, setUploadWalletId,
  calculatePortfolioValue, calculatePortfolioPnL,
  fetchWallets, fetchPortfolio,
  addToPortfolio, removeFromPortfolio,
  authFetch, apiUrl, userId
}) {
    const portfolioValue = calculatePortfolioValue();
    const { pnl, percentage } = calculatePortfolioPnL();

    // Filter positions by wallet
    const filteredPositions = selectedWalletFilter === 'all'
      ? portfolio
      : portfolio.filter(p => p.walletId === selectedWalletFilter);

    const handleCreateWallet = async () => {
      if (!newWallet.name.trim()) return;
      try {
        const response = await authFetch(`${apiUrl}/api/wallets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            name: newWallet.name,
            type: newWallet.type,
            provider: newWallet.provider,
            color: newWallet.color
          })
        });
        if (response.ok) {
          await fetchWallets();
          setNewWallet({ name: '', type: 'exchange', provider: 'binance', color: '#6366f1' });
          setShowCreateWallet(false);
        } else {
          const err = await response.json();
          alert(err.error || 'Error creating wallet');
        }
      } catch (error) {
        alert('Network error: ' + error.message);
      }
    };

    const handleAdd = async () => {
      if (!newPosition.amount || !newPosition.buyPrice || !newPosition.walletId) {
        if (!newPosition.walletId) {
          alert('Primero crea una wallet para agregar posiciones');
          setShowCreateWallet(true);
        }
        return;
      }
      setSaving(true);
      try {
        const res = await authFetch(`${apiUrl}/api/portfolio/${userId}/wallet/${newPosition.walletId}`);
        const data = res.ok ? await res.json() : { wallet: { positions: [] } };
        const existingPositions = (data.wallet?.positions || []).map(p => ({
          asset: p.asset,
          amount: p.amount,
          buyPrice: p.buy_price,
          purchaseDate: p.purchase_date,
          notes: p.notes || '',
          transactionId: p.transaction_id || ''
        }));

        existingPositions.push({
          asset: newPosition.asset,
          amount: parseFloat(newPosition.amount),
          buyPrice: parseFloat(newPosition.buyPrice),
          purchaseDate: new Date().toISOString(),
          notes: '',
          transactionId: ''
        });

        const saveRes = await authFetch(`${apiUrl}/api/portfolio/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            walletId: newPosition.walletId,
            positions: existingPositions
          })
        });

        if (saveRes.ok) {
          await fetchPortfolio();
          setNewPosition(prev => ({ ...prev, amount: '', buyPrice: '' }));
          setShowAddForm(false);
        } else {
          addToPortfolio(newPosition.asset, newPosition.amount, newPosition.buyPrice);
          setNewPosition(prev => ({ ...prev, amount: '', buyPrice: '' }));
          setShowAddForm(false);
        }
      } catch (error) {
        addToPortfolio(newPosition.asset, newPosition.amount, newPosition.buyPrice);
        setNewPosition(prev => ({ ...prev, amount: '', buyPrice: '' }));
        setShowAddForm(false);
      } finally {
        setSaving(false);
      }
    };

    const handleRemovePosition = async (positionId) => {
      try {
        const response = await authFetch(`${apiUrl}/api/portfolio/${userId}/${positionId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchPortfolio();
        } else {
          removeFromPortfolio(positionId);
        }
      } catch {
        removeFromPortfolio(positionId);
      }
    };

    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!uploadWalletId) {
        setUploadStatus({ type: 'error', message: 'Selecciona una wallet primero' });
        e.target.value = '';
        return;
      }

      setUploading(true);
      setUploadStatus(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        formData.append('walletId', uploadWalletId);

        const response = await authFetch(`${apiUrl}/api/portfolio/upload`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          setUploadStatus({ type: 'success', message: result.message });
          await fetchPortfolio();
        } else {
          setUploadStatus({
            type: 'error',
            message: result.error || 'Upload failed',
            details: result.details
          });
        }
      } catch (error) {
        setUploadStatus({ type: 'error', message: 'Network error: ' + error.message });
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };

    const downloadTemplate = () => {
      window.open(`${apiUrl}/api/portfolio/template`, '_blank');
    };

    const walletProviderLabels = {
      binance: 'Binance', bybit: 'Bybit', coinbase: 'Coinbase', kraken: 'Kraken',
      okx: 'OKX', kucoin: 'KuCoin', mercadopago: 'MercadoPago', skipo: 'Skipo',
      lemon: 'Lemon', ripio: 'Ripio', metamask: 'MetaMask', trust_wallet: 'Trust Wallet',
      ledger: 'Ledger', trezor: 'Trezor', phantom: 'Phantom', exodus: 'Exodus', other: 'Otro'
    };

    const walletTypeLabels = {
      exchange: 'Exchange', wallet: 'Wallet', cold_storage: 'Cold Storage', defi: 'DeFi', other: 'Otro'
    };

    const walletColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];

    return (
      <div>
        {/* Portfolio Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={card}>
            <div style={sTitle}>Valor Total</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {formatLargeNumber(portfolioValue)}
            </div>
          </div>
          <div style={card}>
            <div style={sTitle}>P&L</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: pnl >= 0 ? green : red }}>
              {pnl >= 0 ? '+' : ''}{formatLargeNumber(pnl)}
            </div>
            <div style={{ fontSize: 13, color: pnl >= 0 ? green : red, marginTop: 4 }}>
              {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
            </div>
          </div>
          <div style={card}>
            <div style={sTitle}>Posiciones</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{portfolio.length}</div>
          </div>
          <div style={card}>
            <div style={sTitle}>Wallets</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{wallets.length}</div>
          </div>
        </div>

        {/* Wallet Chips */}
        {wallets.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => setSelectedWalletFilter('all')}
              style={{
                padding: "6px 14px",
                background: selectedWalletFilter === 'all' ? purple : bg3,
                border: selectedWalletFilter === 'all' ? 'none' : `1px solid ${border}`,
                borderRadius: 20,
                color: text,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Todas ({portfolio.length})
            </button>
            {wallets.map(w => {
              const count = portfolio.filter(p => p.walletId === w.id).length;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWalletFilter(w.id)}
                  style={{
                    padding: "6px 14px",
                    background: selectedWalletFilter === w.id ? (w.color || purple) : bg3,
                    border: selectedWalletFilter === w.id ? 'none' : `1px solid ${w.color || border}`,
                    borderRadius: 20,
                    color: text,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {w.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setShowBatchUpload(false); setShowCreateWallet(false); }}
            style={{
              padding: "10px",
              background: `linear-gradient(135deg, ${purple}, #7c3aed)`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {showAddForm ? 'Cancelar' : 'Agregar Posicion'}
          </button>
          <button
            onClick={() => { setShowBatchUpload(!showBatchUpload); setShowAddForm(false); setShowCreateWallet(false); }}
            style={{
              padding: "10px",
              background: `linear-gradient(135deg, ${blue}, #2563eb)`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {showBatchUpload ? 'Cancelar' : 'Subir CSV'}
          </button>
          <button
            onClick={() => { setShowCreateWallet(!showCreateWallet); setShowAddForm(false); setShowBatchUpload(false); }}
            style={{
              padding: "10px",
              background: `linear-gradient(135deg, ${green}, #00b894)`,
              border: "none",
              borderRadius: 8,
              color: "#000",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {showCreateWallet ? 'Cancelar' : 'Nueva Wallet'}
          </button>
        </div>

        {/* Create Wallet Form */}
        {showCreateWallet && (
          <div style={{ ...card, marginBottom: 16, borderColor: green }}>
            <div style={sTitle}>CREAR NUEVA WALLET</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>NOMBRE</label>
                <input
                  type="text"
                  value={newWallet.name}
                  onChange={e => setNewWallet(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mi Binance, Ledger Principal..."
                  style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>TIPO</label>
                  <select
                    value={newWallet.type}
                    onChange={e => setNewWallet(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  >
                    {Object.entries(walletTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>PROVEEDOR</label>
                  <select
                    value={newWallet.provider}
                    onChange={e => setNewWallet(prev => ({ ...prev, provider: e.target.value }))}
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  >
                    {Object.entries(walletProviderLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>COLOR</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {walletColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewWallet(prev => ({ ...prev, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: 6, background: c, border: newWallet.color === c ? '2px solid #fff' : '2px solid transparent', cursor: "pointer"
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateWallet}
                style={{
                  padding: "10px",
                  background: `linear-gradient(135deg, ${green}, #00b894)`,
                  border: "none",
                  borderRadius: 6,
                  color: "#000",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Crear Wallet
              </button>
            </div>
          </div>
        )}

        {/* Batch Upload Section */}
        {showBatchUpload && (
          <div style={{ ...card, marginBottom: 16, borderColor: blue }}>
            <div style={sTitle}>IMPORTAR PORTFOLIO (CSV/EXCEL)</div>

            {/* Wallet selector for upload */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>WALLET DESTINO</label>
              {wallets.length === 0 ? (
                <div style={{ fontSize: 12, color: amber, padding: "8px 12px", background: `${amber}15`, borderRadius: 6 }}>
                  Crea una wallet primero para poder subir posiciones
                </div>
              ) : (
                <select
                  value={uploadWalletId}
                  onChange={e => setUploadWalletId(e.target.value)}
                  style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({walletProviderLabels[w.provider] || w.provider})</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{
              background: bg3, borderRadius: 8, padding: "16px", marginBottom: 14,
              border: `1px dashed ${border}`, textAlign: "center"
            }}>
              <div style={{ fontSize: 13, color: text, marginBottom: 12 }}>
                Sube un archivo CSV o Excel con tus posiciones
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading || wallets.length === 0}
                style={{ display: "block", margin: "0 auto 12px", fontSize: 12, color: text }}
              />
              {uploading && (
                <div style={{ fontSize: 12, color: amber, marginTop: 8 }}>Procesando archivo...</div>
              )}
              {uploadStatus && (
                <div style={{
                  fontSize: 12, color: uploadStatus.type === 'success' ? green : red, marginTop: 8,
                  padding: "8px 12px", background: uploadStatus.type === 'success' ? `${green}15` : `${red}15`, borderRadius: 6
                }}>
                  {uploadStatus.message}
                  {uploadStatus.details && (
                    <div style={{ marginTop: 6, fontSize: 11, whiteSpace: "pre-wrap" }}>{uploadStatus.details.join('\n')}</div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={downloadTemplate}
              style={{
                width: "100%", padding: "10px", background: bg3, border: `1px solid ${border}`,
                borderRadius: 6, color: text, fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
            >
              Descargar plantilla CSV
            </button>
            <div style={{ fontSize: 11, color: muted, marginTop: 10, lineHeight: 1.6 }}>
              Formato: Asset, Amount, Buy Price, Purchase Date, Notes<br />
              Assets: bitcoin, ethereum, solana, cardano, ripple, polkadot, dogecoin, binancecoin, avalanche-2, chainlink (o BTC, ETH, SOL, etc.)
            </div>
          </div>
        )}

        {/* Add Position Form */}
        {showAddForm && (
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={sTitle}>Nueva Posicion</div>
            <div style={{ display: "grid", gap: 12 }}>
              {/* Wallet Selector */}
              <div>
                <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>WALLET</label>
                {wallets.length === 0 ? (
                  <div style={{ fontSize: 12, color: amber, padding: "8px 12px", background: `${amber}15`, borderRadius: 6 }}>
                    Crea una wallet primero
                    <button
                      onClick={() => { setShowAddForm(false); setShowCreateWallet(true); }}
                      style={{ marginLeft: 8, padding: "4px 10px", background: green, border: "none", borderRadius: 4, color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Crear
                    </button>
                  </div>
                ) : (
                  <select
                    value={newPosition.walletId}
                    onChange={e => setNewPosition(prev => ({ ...prev, walletId: e.target.value }))}
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({walletProviderLabels[w.provider] || w.provider})</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>ACTIVO</label>
                <select
                  value={newPosition.asset}
                  onChange={e => setNewPosition(prev => ({ ...prev, asset: e.target.value }))}
                  style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                >
                  {marketData && Object.keys(marketData.crypto || {}).map(id => (
                    <option key={id} value={id}>{id.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>CANTIDAD</label>
                  <input
                    type="number" step="0.00000001" value={newPosition.amount}
                    onChange={e => setNewPosition(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.5"
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>PRECIO COMPRA</label>
                  <input
                    type="number" step="0.01" value={newPosition.buyPrice}
                    onChange={e => setNewPosition(prev => ({ ...prev, buyPrice: e.target.value }))}
                    placeholder="65000"
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  />
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={saving}
                style={{
                  padding: "10px",
                  background: saving ? bg3 : `linear-gradient(135deg, ${green}, #00b894)`,
                  border: "none", borderRadius: 6, color: "#000", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer"
                }}
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {(portfolioLoading || walletsLoading) && (
          <div style={{ textAlign: "center", padding: 20, color: muted, fontSize: 13 }}>
            Cargando portfolio...
          </div>
        )}

        {/* Positions List */}
        <div style={card}>
          <div style={sTitle}>
            MIS POSICIONES {selectedWalletFilter !== 'all' && wallets.find(w => w.id === selectedWalletFilter)
              ? `- ${wallets.find(w => w.id === selectedWalletFilter).name}`
              : ''}
          </div>
          {filteredPositions.length === 0 && !portfolioLoading ? (
            <div style={{ padding: 30, textAlign: "center", color: muted }}>
              {wallets.length === 0
                ? 'Crea una wallet primero, luego agrega posiciones.'
                : 'No tienes posiciones. Agrega una arriba o sube un archivo CSV.'}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredPositions.map(position => {
                const currentPrice = marketData?.crypto?.[position.asset]?.price || 0;
                const positionValue = position.amount * currentPrice;
                const positionPnL = positionValue - (position.amount * position.buyPrice);
                const positionPnLPercent = position.buyPrice > 0 ? ((currentPrice - position.buyPrice) / position.buyPrice) * 100 : 0;

                return (
                  <div key={position.id} style={{
                    background: bg3, borderRadius: 8, padding: "14px",
                    borderLeft: position.walletColor ? `3px solid ${position.walletColor}` : 'none',
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
                  }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                        {position.asset.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 11, color: muted }}>
                        {position.amount} @ {formatPrice(position.buyPrice)}
                      </div>
                      {position.walletName && (
                        <div style={{ fontSize: 10, color: position.walletColor || purple, marginTop: 3, fontWeight: 600 }}>
                          {position.walletName}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flex: 1, minWidth: 110 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {formatLargeNumber(positionValue)}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: positionPnL >= 0 ? green : red, marginTop: 4 }}>
                        {positionPnL >= 0 ? '+' : ''}{formatLargeNumber(positionPnL)}
                      </div>
                      <div style={{ fontSize: 11, color: positionPnL >= 0 ? green : red }}>
                        {positionPnL >= 0 ? '+' : ''}{positionPnLPercent.toFixed(2)}%
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePosition(position.id)}
                      style={{
                        padding: "6px 12px", background: "transparent",
                        border: `1px solid ${red}`, borderRadius: 6, color: red, fontSize: 11, cursor: "pointer"
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Wallet Summary Cards */}
        {wallets.length > 0 && (
          <div style={{ ...card, marginTop: 14 }}>
            <div style={sTitle}>MIS WALLETS</div>
            <div style={{ display: "grid", gap: 10 }}>
              {wallets.map(w => {
                const walletPositions = portfolio.filter(p => p.walletId === w.id);
                let walletValue = 0;
                let walletInvested = 0;
                walletPositions.forEach(p => {
                  const cp = marketData?.crypto?.[p.asset]?.price || 0;
                  walletValue += p.amount * cp;
                  walletInvested += p.amount * p.buyPrice;
                });
                const walletPnl = walletValue - walletInvested;

                return (
                  <div key={w.id} style={{
                    background: bg3, borderRadius: 8, padding: "14px",
                    borderLeft: `3px solid ${w.color || purple}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: muted }}>
                        {walletProviderLabels[w.provider] || w.provider} · {walletTypeLabels[w.type] || w.type} · {walletPositions.length} pos.
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{formatLargeNumber(walletValue)}</div>
                      <div style={{ fontSize: 12, color: walletPnl >= 0 ? green : red, fontWeight: 600 }}>
                        {walletPnl >= 0 ? '+' : ''}{formatLargeNumber(walletPnl)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
}
