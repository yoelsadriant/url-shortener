import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMyUrls, shortenUrl } from '@/actions/urlActions';

const USER_ID = '00000000-0000-4000-8000-000000000000';

describe('shortenUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('sends the URL + userId in the body and returns a ShortenResult on success', async () => {
    const mockResult = { shortUrl: 'https://shortn.io/abc123' };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    } as Response);

    const result = await shortenUrl(
      'https://www.example.com/very/long/path',
      USER_ID,
    );

    expect(result).toEqual(mockResult);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/url'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.example.com/very/long/path',
          userId: USER_ID,
        }),
      }),
    );
  });

  it('throws the server error message on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Invalid URL' }),
    } as Response);

    await expect(shortenUrl('not-a-url', USER_ID)).rejects.toThrow(
      'Invalid URL',
    );
  });

  it('unwraps array-of-strings validation errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ message: ['url must be a URL address'] }),
    } as Response);

    await expect(shortenUrl('not-a-url', USER_ID)).rejects.toThrow(
      'url must be a URL address',
    );
  });

  it('falls back to a generic error when the body has no message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error()),
    } as Response);

    await expect(shortenUrl('https://example.com', USER_ID)).rejects.toThrow(
      'Request failed (500)',
    );
  });
});

describe('getMyUrls', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GETs /url with the user query and returns the list', async () => {
    const records = [
      {
        code: 'abc',
        originUrl: 'https://example.com',
        userId: USER_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(records),
    } as Response);

    const result = await getMyUrls(USER_ID);
    expect(result).toEqual(records);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/url?user=${USER_ID}`),
    );
  });
});
