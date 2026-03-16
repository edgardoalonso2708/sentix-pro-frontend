import { supabase } from './supabase';

/**
 * Authenticated fetch wrapper.
 * Automatically attaches Authorization: Bearer <token> header
 * when a Supabase session is available.
 *
 * Falls back to regular fetch if Supabase is not configured.
 */
export async function authFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach auth token if available
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // Continue without auth token
    }
  }

  return fetch(url, { ...options, headers, cache: 'no-store' });
}

/**
 * Get the current auth token for SSE connections (query param).
 * Returns null if no session.
 */
export async function getAuthToken() {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}
