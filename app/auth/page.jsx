'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0f1c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Cargando...
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const { signIn, signUp, authEnabled, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [mode, setMode] = useState(inviteToken ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);

  // Validate invitation token on mount
  useEffect(() => {
    if (!inviteToken) return;

    async function validateInvite() {
      try {
        const res = await fetch(`${API_URL}/api/auth/accept-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken }),
        });
        if (res.ok) {
          const { email: inviteEmail, role } = await res.json();
          setEmail(inviteEmail);
          setInviteRole(role);
          setMode('register');
        } else {
          const { error: errMsg } = await res.json();
          setError(errMsg || 'Invalid or expired invitation');
        }
      } catch {
        setError('Failed to validate invitation');
      } finally {
        setInviteLoading(false);
      }
    }

    validateInvite();
  }, [inviteToken]);

  // If auth not configured, redirect to main
  if (!authEnabled) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  // If already logged in, redirect
  if (user) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err.message);
        } else {
          router.push('/');
        }
      } else {
        const { data, error: err } = await signUp(email, password);
        if (err) {
          setError(err.message);
        } else if (data?.user?.identities?.length === 0) {
          setError('An account with this email already exists');
        } else {
          // If invitation, claim it
          if (inviteToken && data?.session?.access_token) {
            try {
              await authFetch(`${API_URL}/api/auth/claim-invite`, {
                method: 'POST',
                body: JSON.stringify({ token: inviteToken }),
              });
            } catch {
              // Non-blocking — profile will be claimed on next login
            }
          }
          setSuccess(inviteToken
            ? 'Cuenta creada con rol ' + (inviteRole || 'viewer') + '. Redirigiendo...'
            : 'Cuenta creada! Revisa tu email para confirmar.'
          );
          if (inviteToken && data?.session) {
            setTimeout(() => router.push('/'), 1500);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Styling
  const bg = '#0a0f1c';
  const surface = '#111827';
  const border = '#1e293b';
  const primary = '#6366f1';
  const text = '#e2e8f0';
  const muted = '#94a3b8';

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 40,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: primary, letterSpacing: '-0.02em' }}>
            SENTIX PRO
          </div>
          <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
            Crypto Trading Intelligence
          </div>
        </div>

        {/* Invitation Badge */}
        {inviteToken && inviteRole && (
          <div style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: primary,
            textAlign: 'center',
          }}>
            Invitado como <strong>{inviteRole.toUpperCase()}</strong>
          </div>
        )}

        {inviteLoading ? (
          <div style={{ textAlign: 'center', color: muted, padding: '40px 0' }}>
            Validando invitacion...
          </div>
        ) : (
          <>
            {/* Tab Toggle — hide if invitation (force register) */}
            {!inviteToken && (
              <div style={{
                display: 'flex',
                gap: 0,
                marginBottom: 24,
                background: bg,
                borderRadius: 8,
                padding: 3,
              }}>
                {['login', 'register'].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      border: 'none',
                      borderRadius: 6,
                      background: mode === m ? primary : 'transparent',
                      color: mode === m ? '#fff' : muted,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {m === 'login' ? 'Iniciar Sesion' : 'Registrarse'}
                  </button>
                ))}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: muted, marginBottom: 6, fontWeight: 600 }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={!!inviteToken}
                  placeholder="tu@email.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: inviteToken ? '#1a1a2e' : bg,
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    color: text,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: inviteToken ? 0.7 : 1,
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: muted, marginBottom: 6, fontWeight: 600 }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 caracteres"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    color: text,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#ef4444',
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#22c55e',
                }}>
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  background: loading ? border : primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {loading
                  ? 'Procesando...'
                  : mode === 'login'
                    ? 'Iniciar Sesion'
                    : inviteToken
                      ? 'Aceptar Invitacion'
                      : 'Crear Cuenta'
                }
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
