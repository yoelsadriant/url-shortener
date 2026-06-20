import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shortenUrl } from '@/actions/urlActions';

describe('shortenUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a ShortenResult on success', async () => {
    const mockResult = {
      shortUrl: 'https://shortn.io/abc123',
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    } as Response);

    const result = await shortenUrl('https://www.example.com/very/long/path');

    expect(result).toEqual(mockResult);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/url'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.example.com/very/long/path' }),
      }),
    );
  });

  it('throws the server error message on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Invalid URL' }),
    } as Response);

    await expect(shortenUrl('not-a-url')).rejects.toThrow('Invalid URL');
  });

  it('falls back to a generic error message when response body has no message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error()),
    } as Response);

    await expect(shortenUrl('https://example.com')).rejects.toThrow(
      'Request failed with status 500',
    );
  });
});
