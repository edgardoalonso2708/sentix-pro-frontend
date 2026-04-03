'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../lib/api';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Styles ──────────────────────────────────────────────────────────────────
const bg = '#0a0f1c';
const surface = '#111827';
const surfaceAlt = '#1a1f2e';
const border = '#1e293b';
const primary = '#6366f1';
const text = '#e2e8f0';
const muted = '#94a3b8';
const green = '#22c55e';
const red = '#ef4444';
const yellow = '#eab308';

const cardStyle = {
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
};

const inputStyle = {
  padding: '10px 14px',
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 8,
  color: text,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle = (color = primary) => ({
  padding: '10px 20px',
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
});

const ROLE_COLORS = {
  admin: '#6366f1',
  trader: '#22c55e',
  viewer: '#94a3b8',
};

const ROLE_LABELS = {
  admin: 'ADMIN',
  trader: 'TRADER',
  viewer: 'VIEWER',
};

export default function AdminPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('users'); // users | audit | maintenance
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Maintenance state
  const [maintenanceStatus, setMaintenanceStatus] = useState(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  // Invite form
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('trader');
  const [invName, setInvName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invResult, setInvResult] = useState(null);

  // Audit filters
  const [auditDays, setAuditDays] = useState(7);
  const [auditAction, setAuditAction] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/admin/users`);
      if (res.ok) {
        const { users: u } = await res.json();
        setUsers(u || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchMaintenance = useCallback(async () => {
    setMaintenanceLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/maintenance/status`);
      if (res.ok) {
        const data = await res.json();
        setMaintenanceStatus(data);
      }
    } catch { /* ignore */ }
    finally { setMaintenanceLoading(false); }
  }, []);

  const handlePurge = async (dryRun = false) => {
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await authFetch(`${API_URL}/api/maintenance/purge`, {
        method: 'POST',
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      setPurgeResult(data);
      if (!dryRun) fetchMaintenance();
    } catch {
      setPurgeResult({ error: 'Error de conexion' });
    } finally {
      setPurging(false);
    }
  };

  const fetchAudit = useCallback(async () => {
    try {
      let url = `${API_URL}/api/admin/audit?days=${auditDays}&limit=100`;
      if (auditAction) url += `&action=${auditAction}`;
      const res = await authFetch(url);
      if (res.ok) {
        const { logs } = await res.json();
        setAuditLogs(logs || []);
      }
    } catch { /* ignore */ }
  }, [auditDays, auditAction]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.push('/');
      return;
    }
    setLoadingData(true);
    Promise.all([fetchUsers(), fetchAudit(), fetchMaintenance()]).finally(() => setLoadingData(false));
  }, [authLoading, isAdmin, router, fetchUsers, fetchAudit]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInvResult(null);
    try {
      const res = await authFetch(`${API_URL}/api/admin/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: invEmail, role: invRole, display_name: invName }),
      });
      const data = await res.json();
      if (res.ok) {
        setInvResult({ type: 'success', message: `Invitacion enviada. ${data.emailSent ? 'Email enviado.' : 'Comparte el link manualmente.'}`, link: data.inviteLink });
        setInvEmail('');
        setInvName('');
        fetchUsers();
      } else {
        setInvResult({ type: 'error', message: data.error || 'Error al invitar' });
      }
    } catch {
      setInvResult({ type: 'error', message: 'Error de conexion' });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await authFetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch { /* ignore */ }
  };

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await authFetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchUsers();
    } catch { /* ignore */ }
  };

  if (authLoading || loadingData) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted }}>
        Cargando...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      color: text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px 16px',
      maxWidth: 960,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: primary, margin: 0 }}>Admin Panel</h1>
          <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>Gestion de usuarios y auditoria</p>
        </div>
        <button onClick={() => router.push('/')} style={{ ...btnStyle('#374151'), fontSize: 12 }}>
          Volver al Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: surfaceAlt, borderRadius: 8, padding: 3 }}>
        {[{ id: 'users', label: 'Usuarios' }, { id: 'audit', label: 'Audit Log' }, { id: 'maintenance', label: 'Mantenimiento' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '10px 0', border: 'none', borderRadius: 6,
              background: tab === t.id ? primary : 'transparent',
              color: tab === t.id ? '#fff' : muted,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── USERS TAB ──────────────────────────────────────────────── */}
      {tab === 'users' && (
        <>
          {/* Invite Form */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>Invitar Usuario</h3>
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: 11, color: muted, marginBottom: 4, fontWeight: 600 }}>EMAIL</label>
                <input
                  type="email"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  required
                  placeholder="usuario@email.com"
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
              <div style={{ flex: '0 0 120px' }}>
                <label style={{ display: 'block', fontSize: 11, color: muted, marginBottom: 4, fontWeight: 600 }}>ROL</label>
                <select
                  value={invRole}
                  onChange={e => setInvRole(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                >
                  <option value="trader">Trader</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: 11, color: muted, marginBottom: 4, fontWeight: 600 }}>NOMBRE</label>
                <input
                  value={invName}
                  onChange={e => setInvName(e.target.value)}
                  placeholder="Opcional"
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
              <button type="submit" disabled={inviting} style={{ ...btnStyle(), opacity: inviting ? 0.6 : 1 }}>
                {inviting ? 'Enviando...' : 'Enviar Invitacion'}
              </button>
            </form>

            {invResult && (
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                background: invResult.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${invResult.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: invResult.type === 'success' ? green : red,
              }}>
                {invResult.message}
                {invResult.link && (
                  <div style={{ marginTop: 8, fontSize: 11, color: muted, wordBreak: 'break-all' }}>
                    Link: {invResult.link}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Users List */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>
              Usuarios ({users.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: muted, fontWeight: 600 }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: muted, fontWeight: 600 }}>Nombre</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', color: muted, fontWeight: 600 }}>Rol</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', color: muted, fontWeight: 600 }}>Estado</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', color: muted, fontWeight: 600 }}>Ultimo Login</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', color: muted, fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${border}`, opacity: u.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '10px 12px' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px', color: muted }}>{u.display_name || '-'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {u.id === user?.id ? (
                          <span style={{ background: ROLE_COLORS[u.role], color: '#fff', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                            {ROLE_LABELS[u.role]}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            style={{ ...inputStyle, padding: '4px 8px', fontSize: 12, textAlign: 'center' }}
                          >
                            <option value="admin">Admin</option>
                            <option value="trader">Trader</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          color: u.is_active ? green : red,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {u.is_active ? (u.invitation_token ? 'PENDIENTE' : 'ACTIVO') : 'INACTIVO'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: muted, fontSize: 12 }}>
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            style={{
                              ...btnStyle(u.is_active ? '#dc2626' : '#16a34a'),
                              padding: '4px 12px',
                              fontSize: 11,
                            }}
                          >
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: muted }}>
                        No hay usuarios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── MAINTENANCE TAB ───────────────────────────────────────── */}
      {tab === 'maintenance' && (
        <>
          {/* Table Sizes */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Estado de Tablas</h3>
              <button
                onClick={fetchMaintenance}
                disabled={maintenanceLoading}
                style={{ ...btnStyle('#374151'), padding: '6px 14px', fontSize: 12, opacity: maintenanceLoading ? 0.6 : 1 }}
              >
                {maintenanceLoading ? 'Cargando...' : 'Refrescar'}
              </button>
            </div>

            {maintenanceStatus?.tableSizes && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${border}` }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: muted, fontWeight: 600 }}>Tabla</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: muted, fontWeight: 600 }}>Filas</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', color: muted, fontWeight: 600 }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceStatus.tableSizes.map(t => {
                      const severity = t.rows > 100000 ? 'critical' : t.rows > 50000 ? 'warning' : t.rows > 10000 ? 'info' : 'ok';
                      const sevColor = severity === 'critical' ? red : severity === 'warning' ? yellow : severity === 'info' ? '#3b82f6' : green;
                      const sevLabel = severity === 'critical' ? 'CRITICO' : severity === 'warning' ? 'ALERTA' : severity === 'info' ? 'GRANDE' : 'OK';
                      return (
                        <tr key={t.table} style={{ borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{t.table}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {t.rows >= 0 ? t.rows.toLocaleString() : t.error || 'N/A'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                              background: `${sevColor}20`, color: sevColor,
                            }}>
                              {sevLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Retention Config */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>Retencion de Datos</h3>
            {maintenanceStatus?.retentionConfig && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {maintenanceStatus.retentionConfig.map(r => (
                  <div key={r.table} style={{
                    background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '12px 16px',
                  }}>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: muted, marginBottom: 4 }}>{r.table}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
                      Retencion: <span style={{ color: primary, fontWeight: 600 }}>{r.retentionDays} dias</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last Purge Info */}
          {maintenanceStatus?.lastPurge && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>Ultimo Purge</h3>
              <div style={{ fontSize: 13, color: muted }}>
                Fecha: <span style={{ color: text }}>{new Date(maintenanceStatus.lastPurge).toLocaleString()}</span>
              </div>
              {maintenanceStatus.lastPurgeResults && (
                <div style={{ marginTop: 8, fontSize: 13, color: muted }}>
                  Filas eliminadas: <span style={{ color: green, fontWeight: 600 }}>{maintenanceStatus.lastPurgeResults.totalDeleted?.toLocaleString() || 0}</span>
                  {' | '}Tablas procesadas: {maintenanceStatus.lastPurgeResults.results?.length || 0}
                  {maintenanceStatus.lastPurgeResults.errors?.length > 0 && (
                    <span style={{ color: red }}> | Errores: {maintenanceStatus.lastPurgeResults.errors.length}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Purge Actions */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>Limpieza Manual</h3>
            <p style={{ fontSize: 13, color: muted, marginTop: 0, marginBottom: 16 }}>
              Elimina registros antiguos segun la politica de retencion configurada.
              Usa "Simulacion" primero para ver que se eliminaria sin borrar datos.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => handlePurge(true)}
                disabled={purging}
                style={{ ...btnStyle('#374151'), opacity: purging ? 0.6 : 1 }}
              >
                {purging ? 'Procesando...' : 'Simulacion (Dry Run)'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Esto eliminara datos antiguos de forma permanente. Continuar?')) {
                    handlePurge(false);
                  }
                }}
                disabled={purging}
                style={{ ...btnStyle(red), opacity: purging ? 0.6 : 1 }}
              >
                {purging ? 'Procesando...' : 'Ejecutar Purge'}
              </button>
            </div>

            {/* Purge Result */}
            {purgeResult && (
              <div style={{
                marginTop: 16, padding: 16, borderRadius: 8,
                background: purgeResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${purgeResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              }}>
                {purgeResult.error ? (
                  <div style={{ color: red, fontSize: 13 }}>{purgeResult.error}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: green, marginBottom: 8 }}>
                      {purgeResult.message}
                    </div>
                    {Array.isArray(purgeResult.results) && purgeResult.results.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${border}` }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px', color: muted }}>Tabla</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', color: muted }}>
                              {purgeResult.results[0]?.wouldDelete !== undefined ? 'Se eliminarian' : 'Eliminadas'}
                            </th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', color: muted }}>Retencion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purgeResult.results.map(r => (
                            <tr key={r.table} style={{ borderBottom: `1px solid ${border}` }}>
                              <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>{r.label || r.table}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: (r.deleted || r.wouldDelete) > 0 ? yellow : muted }}>
                                {r.skipped ? 'N/A' : (r.deleted ?? r.wouldDelete ?? 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: muted }}>{r.retentionDays ? `${r.retentionDays}d` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Growth Alerts */}
          {maintenanceStatus?.growthAlerts?.length > 0 && (
            <div style={{
              ...cardStyle,
              borderColor: yellow + '60',
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 12, color: yellow }}>
                Alertas de Crecimiento
              </h3>
              {maintenanceStatus.growthAlerts.map(a => (
                <div key={a.table} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', marginBottom: 8, borderRadius: 6,
                  background: a.severity === 'critical' ? 'rgba(239,68,68,0.1)' : a.severity === 'warning' ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)',
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.table}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: a.severity === 'critical' ? red : a.severity === 'warning' ? yellow : '#3b82f6',
                  }}>
                    {a.rows.toLocaleString()} filas
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── AUDIT TAB ──────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Audit Log</h3>
            <select
              value={auditDays}
              onChange={e => setAuditDays(Number(e.target.value))}
              style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
            >
              <option value={1}>Ultimo dia</option>
              <option value={7}>Ultimos 7 dias</option>
              <option value={30}>Ultimos 30 dias</option>
            </select>
            <select
              value={auditAction}
              onChange={e => setAuditAction(e.target.value)}
              style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
            >
              <option value="">Todas las acciones</option>
              <option value="login">Login</option>
              <option value="login_failed">Login fallido</option>
              <option value="trade_opened">Trade abierto</option>
              <option value="trade_closed">Trade cerrado</option>
              <option value="config_change">Config cambiada</option>
              <option value="kill_switch">Kill switch</option>
              <option value="invite_sent">Invitacion enviada</option>
              <option value="invite_claimed">Invitacion aceptada</option>
              <option value="role_change">Cambio de rol</option>
            </select>
            <button onClick={fetchAudit} style={{ ...btnStyle('#374151'), padding: '6px 14px', fontSize: 12 }}>
              Refrescar
            </button>
          </div>

          <div style={{ maxHeight: 600, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, background: surface }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600 }}>Fecha</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600 }}>Accion</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600 }}>Recurso</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600 }}>Detalles</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600 }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '8px 10px', color: muted, whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: log.action.includes('fail') || log.action === 'kill_switch'
                          ? 'rgba(239,68,68,0.15)' : log.action.includes('invite') || log.action.includes('login')
                          ? 'rgba(99,102,241,0.15)' : 'rgba(34,197,94,0.15)',
                        color: log.action.includes('fail') || log.action === 'kill_switch'
                          ? red : log.action.includes('invite') || log.action.includes('login')
                          ? primary : green,
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: muted }}>{log.email || '-'}</td>
                    <td style={{ padding: '8px 10px', color: muted }}>{log.resource || '-'}</td>
                    <td style={{ padding: '8px 10px', color: muted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.details && Object.keys(log.details).length > 0
                        ? JSON.stringify(log.details).substring(0, 80)
                        : '-'}
                    </td>
                    <td style={{ padding: '8px 10px', color: muted, fontSize: 11 }}>{log.ip_address || '-'}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: muted }}>
                      No hay registros de auditoria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
