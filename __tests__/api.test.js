import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing api module
vi.mock('../app/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { authFetch, getAuthToken } from '../app/lib/api';
import { supabase } from '../app/lib/supabase';

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(new Response('{}'));
});

// ─── authFetch ────────────────────────────────────────────────────────────────
describe('authFetch', () => {
  it('attaches Authorization header when session exists', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token-123' } },
    });

    await authFetch('http://localhost:3001/api/test');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-123',
      },
    });
  });

  it('sends request without auth when no session', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    await authFetch('http://localhost:3001/api/test');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('continues without auth when getSession throws', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('Network error'));

    await authFetch('http://localhost:3001/api/test');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('preserves custom headers and options', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });

    await authFetch('http://localhost:3001/api/test', {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
      body: '{"key":"val"}',
    });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
      method: 'POST',
      body: '{"key":"val"}',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom': 'value',
        Authorization: 'Bearer tok',
      },
    });
  });

  it('allows overriding Content-Type', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    await authFetch('http://localhost:3001/api/upload', {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/upload', {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  });
});

// ─── getAuthToken ─────────────────────────────────────────────────────────────
describe('getAuthToken', () => {
  it('returns access_token when session exists', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'my-token' } },
    });

    const token = await getAuthToken();
    expect(token).toBe('my-token');
  });

  it('returns null when no session', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const token = await getAuthToken();
    expect(token).toBeNull();
  });

  it('returns null when getSession throws', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('fail'));

    const token = await getAuthToken();
    expect(token).toBeNull();
  });
});
