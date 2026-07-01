import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api, ApiError, getActiveUserId, setStoredUserId } from './apiClient';

describe('apiClient user id storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when no user id stored', () => {
    expect(getActiveUserId()).toBeNull();
  });

  it('persists and retrieves the active user id', () => {
    setStoredUserId('user-1');
    expect(getActiveUserId()).toBe('user-1');
  });
});

describe('apiClient request behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('attaches X-User-Id header when a user is active', async () => {
    setStoredUserId('user-42');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await api.get('/incidents');

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers['X-User-Id']).toBe('user-42');
  });

  it('omits X-User-Id header when no user is active', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await api.get('/incidents');

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers['X-User-Id']).toBeUndefined();
  });

  it('sends JSON body and method for POST', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ incidentId: '1' }),
    });

    await api.post('/incidents', { title: 'x' });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ title: 'x' }));
  });

  it('throws ApiError with status/code/message from the error envelope on failure', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ error: { code: 'ILLEGAL_TRANSITION', message: 'Cannot transition' } }),
    });

    await expect(api.get('/incidents/1')).rejects.toMatchObject({
      status: 409,
      code: 'ILLEGAL_TRANSITION',
      message: 'Cannot transition',
    });
  });

  it('falls back to a generic error when the response body is not JSON', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(api.get('/incidents/1')).rejects.toBeInstanceOf(ApiError);
  });
});
