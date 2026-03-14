'use client';
import { authFetch } from '../../lib/api';
import { colors, card, sTitle } from '../../lib/theme';
import { formatPrice } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

export default function AlertsTab({
  alertConfig, setAlertConfig, alerts,
  alertTestResult, setAlertTestResult,
  alertTesting, setAlertTesting,
  alertShowFilters, setAlertShowFilters,
  alertFilterForm, setAlertFilterForm,
  alertSavingFilters, setAlertSavingFilters,
  alertFilterSaveMsg, setAlertFilterSaveMsg,
  apiUrl,
}) {
    const { t } = useLanguage();
    const testResult = alertTestResult, setTestResult = setAlertTestResult;
    const testing = alertTesting, setTesting = setAlertTesting;
    const showFilters = alertShowFilters, setShowFilters = setAlertShowFilters;
    const filterForm = alertFilterForm, setFilterForm = setAlertFilterForm;
    const savingFilters = alertSavingFilters, setSavingFilters = setAlertSavingFilters;
    const filterSaveMsg = alertFilterSaveMsg, setFilterSaveMsg = setAlertFilterSaveMsg;

    const handleSaveFilters = async () => {
      if (!filterForm) return;
      setSavingFilters(true);
      setFilterSaveMsg(null);
      try {
        const res = await authFetch(`${apiUrl}/api/alert-filters/default-user`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filterForm)
        });
        if (res.ok) {
          setFilterSaveMsg({ ok: true, text: t('alert.filtersSaved') });
        } else {
          setFilterSaveMsg({ ok: false, text: t('alert.errorSaving') });
        }
      } catch (e) {
        setFilterSaveMsg({ ok: false, text: e.message });
      } finally {
        setSavingFilters(false);
        setTimeout(() => setFilterSaveMsg(null), 3000);
      }
    };

    const handleTestAlert = async () => {
      setTesting(true);
      setTestResult(null);
      try {
        const response = await authFetch(`${apiUrl}/api/send-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: alertConfig.email,
            message: 'Test alert from SENTIX Pro - System working correctly!'
          })
        });
        const data = await response.json();
        setTestResult(data);
      } catch (error) {
        setTestResult({ success: false, message: 'Error: ' + error.message });
      } finally {
        setTesting(false);
      }
    };

    const ALL_ACTIONS = ['STRONG BUY', 'BUY', 'WEAK BUY', 'STRONG SELL', 'SELL', 'WEAK SELL'];
    const AVAILABLE_ASSETS = ['BITCOIN', 'ETHEREUM', 'BINANCECOIN', 'SOLANA', 'CARDANO', 'RIPPLE'];

    return (
      <div>
        {/* Telegram Setup - Primary alert channel */}
        <div style={{
          background: "rgba(59, 130, 246, 0.1)",
          border: `1px solid ${blue}`,
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 16
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: blue, marginBottom: 8 }}>
            {t('alert.telegram')} ({t('alert.telegramActive')})
          </div>
          <div style={{ fontSize: 12, color: text, lineHeight: 1.8 }}>
            {t('alert.step1')}<br />
            {t('alert.step2')} <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/start</code><br />
            {t('alert.step3')}<br />
            {t('alert.step4')} <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/senales</code><br />
            {t('alert.step5')} <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/stop</code>
          </div>
        </div>

        {/* Config */}
        <div style={card}>
          <div style={sTitle}>{t('alert.config')}</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>
              {t('alert.emailLabel')}
            </label>
            <textarea
              value={alertConfig.email}
              onChange={e => setAlertConfig(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email1@ejemplo.com, email2@ejemplo.com"
              rows={2}
              style={{
                width: "100%",
                background: bg3,
                border: `1px solid ${border}`,
                borderRadius: 6,
                padding: "10px 14px",
                color: text,
                fontSize: 13,
                resize: "vertical",
                fontFamily: "inherit"
              }}
            />
            <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>
              {t('alert.emailDescription')}
            </div>
          </div>

          <button
            onClick={handleTestAlert}
            disabled={testing}
            style={{
              width: "100%",
              padding: "10px",
              background: testing ? bg3 : `linear-gradient(135deg, ${purple}, #7c3aed)`,
              border: "none",
              borderRadius: 7,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: testing ? "not-allowed" : "pointer"
            }}
          >
            {testing ? t('alert.sending') : t('alert.sendTest')}
          </button>

          {testResult && (
            <div style={{
              marginTop: 12,
              padding: "12px 14px",
              background: bg3,
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.8
            }}>
              <div style={{ color: testResult.success ? green : red, fontWeight: 700, marginBottom: 6 }}>
                {testResult.success ? t('alert.testProcessed') : t('alert.error')}
              </div>
              {testResult.delivery && (
                <div style={{ color: text, fontSize: 11 }}>
                  Email: <span style={{ color: testResult.delivery.email === 'sent' ? green : amber }}>
                    {testResult.delivery.email === 'sent' ? t('alert.sent') : testResult.delivery.email}
                  </span><br />
                  Telegram: <span style={{ color: testResult.delivery.telegram === 'sent' ? green : amber }}>
                    {testResult.delivery.telegram === 'sent' ? t('alert.sent') : testResult.delivery.telegram}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom Alert Filters */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowFilters(!showFilters)}>
            <div style={sTitle}>{t('alert.customFilters')}</div>
            <div style={{ fontSize: 18, color: muted, transform: showFilters ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>{'\u25BC'}</div>
          </div>

          {showFilters && filterForm && (
            <div style={{ marginTop: 14 }}>
              {/* Master switch */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <button onClick={() => setFilterForm(p => ({ ...p, enabled: !p.enabled }))} style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                  background: filterForm.enabled ? green : bg3,
                  position: "relative", transition: "background 0.2s"
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: "#fff",
                    position: "absolute", top: 3, left: filterForm.enabled ? 22 : 4,
                    transition: "left 0.2s"
                  }} />
                </button>
                <span style={{ fontSize: 12, color: filterForm.enabled ? text : muted, fontWeight: 700 }}>
                  {filterForm.enabled ? t('alert.filtersActive') : t('alert.filtersDisabled')}
                </span>
              </div>

              {/* Signal types */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, marginBottom: 6, display: "block", fontWeight: 700 }}>{t('alert.signalTypes')}</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ALL_ACTIONS.map(act => {
                    const active = filterForm.actions.includes(act);
                    const isBuy = act.includes('BUY');
                    const clr = isBuy ? green : red;
                    return (
                      <button key={act} onClick={() => {
                        setFilterForm(p => ({
                          ...p,
                          actions: active ? p.actions.filter(a => a !== act) : [...p.actions, act]
                        }));
                      }} style={{
                        padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 700,
                        background: active ? `${clr}20` : bg3,
                        color: active ? clr : muted,
                        border: `1px solid ${active ? clr : border}`
                      }}>
                        {act}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assets filter */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, marginBottom: 6, display: "block", fontWeight: 700 }}>
                  {t('alert.assets')} ({filterForm.assets.length === 0 ? t('alert.all') : filterForm.assets.length + ' ' + t('alert.selected')})
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {AVAILABLE_ASSETS.map(asset => {
                    const active = filterForm.assets.includes(asset);
                    return (
                      <button key={asset} onClick={() => {
                        setFilterForm(p => ({
                          ...p,
                          assets: active ? p.assets.filter(a => a !== asset) : [...p.assets, asset]
                        }));
                      }} style={{
                        padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 700,
                        background: active ? `${blue}20` : bg3,
                        color: active ? blue : muted,
                        border: `1px solid ${active ? blue : border}`
                      }}>
                        {asset}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>{t('alert.noSelectionAll')}</div>
              </div>

              {/* Min confidence slider */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 4, fontWeight: 700 }}>
                  {t('alert.minConfidence')}: <span style={{ color: text }}>{filterForm.min_confidence}%</span>
                </label>
                <input type="range" min="20" max="90" step="5"
                  value={filterForm.min_confidence}
                  onChange={e => setFilterForm(p => ({ ...p, min_confidence: parseInt(e.target.value) }))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Min score slider */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 4, fontWeight: 700 }}>
                  {t('alert.minScore')}: <span style={{ color: text }}>{filterForm.min_score}</span>
                </label>
                <input type="range" min="10" max="60" step="5"
                  value={filterForm.min_score}
                  onChange={e => setFilterForm(p => ({ ...p, min_score: parseInt(e.target.value) }))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Cooldown */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 4, fontWeight: 700 }}>
                  COOLDOWN: <span style={{ color: text }}>{filterForm.cooldown_minutes} min</span>
                </label>
                <input type="range" min="5" max="120" step="5"
                  value={filterForm.cooldown_minutes}
                  onChange={e => setFilterForm(p => ({ ...p, cooldown_minutes: parseInt(e.target.value) }))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Delivery channels */}
              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: text, cursor: "pointer" }}>
                  <input type="checkbox" checked={filterForm.telegram_enabled}
                    onChange={e => setFilterForm(p => ({ ...p, telegram_enabled: e.target.checked }))} />
                  Telegram
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: text, cursor: "pointer" }}>
                  <input type="checkbox" checked={filterForm.email_enabled}
                    onChange={e => setFilterForm(p => ({ ...p, email_enabled: e.target.checked }))} />
                  Email
                </label>
              </div>

              {/* Email recipients for notifications */}
              {filterForm.email_enabled && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 6, fontWeight: 700 }}>
                    {t('alert.notificationEmails')}
                  </label>
                  <textarea
                    value={filterForm.alert_emails || ''}
                    onChange={e => setFilterForm(p => ({ ...p, alert_emails: e.target.value }))}
                    placeholder="email1@ejemplo.com, email2@ejemplo.com"
                    rows={2}
                    style={{
                      width: "100%",
                      background: bg3,
                      border: `1px solid ${border}`,
                      borderRadius: 6,
                      padding: "8px 12px",
                      color: text,
                      fontSize: 12,
                      resize: "vertical",
                      fontFamily: "inherit"
                    }}
                  />
                  <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>
                    {t('alert.notificationEmailsDescription')}
                  </div>
                </div>
              )}

              {/* Save button */}
              <button onClick={handleSaveFilters} disabled={savingFilters} style={{
                width: "100%", padding: "10px", border: "none", borderRadius: 7, cursor: savingFilters ? "not-allowed" : "pointer",
                background: savingFilters ? bg3 : `linear-gradient(135deg, ${blue}, #3b82f6)`,
                color: "#fff", fontSize: 12, fontWeight: 700
              }}>
                {savingFilters ? t('alert.saving') : t('alert.saveFilters')}
              </button>

              {filterSaveMsg && (
                <div style={{ marginTop: 8, fontSize: 11, color: filterSaveMsg.ok ? green : red, textAlign: "center" }}>
                  {filterSaveMsg.ok ? '\u2705' : '\u274C'} {filterSaveMsg.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alert History */}
        <div style={card}>
          <div style={sTitle}>{t('alert.history')}</div>
          {alerts.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: muted }}>
              {t('alert.noAlerts')}
            </div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {alerts.map((alert, i) => (
                <div key={alert.id || i} style={{
                  background: bg3,
                  borderLeft: `3px solid ${alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber}`,
                  borderRadius: 6,
                  padding: "12px 14px",
                  marginBottom: 10
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {alert.action === 'BUY' ? '\u{1F7E2}' : alert.action === 'SELL' ? '\u{1F534}' : '\u26AA'} {alert.asset}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber,
                      fontWeight: 700,
                      background: `${alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber}22`,
                      padding: "3px 8px",
                      borderRadius: 4
                    }}>
                      {alert.action}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                    Score: {alert.score}/100 | {t('alert.confidence')}: {alert.confidence}% | {t('alert.price')}: {formatPrice(alert.price)}
                  </div>
                  <div style={{ fontSize: 11, color: text }}>
                    {alert.reasons}
                  </div>
                  <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 6 }}>
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
}
