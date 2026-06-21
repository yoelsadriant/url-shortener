import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlShortener } from '@/hooks/useUrlShortener';
import * as urlActions from '@/actions/urlActions';

vi.mock('@/actions/urlActions');

const USER_ID = '00000000-0000-4000-8000-000000000000';
const mockResult = { shortUrl: 'https://shortn.io/abc' };

describe('useUrlShortener', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('starts with default empty state', () => {
    const { result } = renderHook(() => useUrlShortener(USER_ID));
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('refuses to shorten when no userId is provided', async () => {
    const { result } = renderHook(() => useUrlShortener(null));
    await act(async () => {
      await result.current.shorten('https://example.com');
    });
    expect(result.current.error).toBe('You must be signed in to shorten URLs');
    expect(urlActions.shortenUrl).not.toHaveBeenCalled();
  });

  it('sets isLoading while the request is in flight', () => {
    vi.mocked(urlActions.shortenUrl).mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(mockResult), 200)),
    );
    const { result } = renderHook(() => useUrlShortener(USER_ID));

    act(() => {
      result.current.shorten('https://example.com');
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('stores result and clears loading on success', async () => {
    vi.mocked(urlActions.shortenUrl).mockResolvedValueOnce(mockResult);
    const { result } = renderHook(() => useUrlShortener(USER_ID));

    await act(async () => {
      await result.current.shorten('https://example.com');
    });

    expect(result.current.result).toEqual(mockResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(urlActions.shortenUrl).toHaveBeenCalledWith(
      'https://example.com',
      USER_ID,
    );
  });

  it('stores error message and clears loading on failure', async () => {
    vi.mocked(urlActions.shortenUrl).mockRejectedValueOnce(
      new Error('Invalid URL'),
    );
    const { result } = renderHook(() => useUrlShortener(USER_ID));

    await act(async () => {
      await result.current.shorten('bad-url');
    });

    expect(result.current.error).toBe('Invalid URL');
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('falls back to a generic error for non-Error throws', async () => {
    vi.mocked(urlActions.shortenUrl).mockRejectedValueOnce(
      'unexpected string error',
    );
    const { result } = renderHook(() => useUrlShortener(USER_ID));

    await act(async () => {
      await result.current.shorten('https://example.com');
    });

    expect(result.current.error).toBe('Failed to shorten URL');
  });
});
