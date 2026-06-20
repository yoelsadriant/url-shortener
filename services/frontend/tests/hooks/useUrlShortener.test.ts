import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlShortener } from '@/hooks/useUrlShortener';
import * as urlActions from '@/actions/urlActions';

vi.mock('@/actions/urlActions');

const mockResult = {
  shortUrl: 'https://shortn.io/abc',
  originalUrl: 'https://example.com',
  shortCode: 'abc',
};

describe('useUrlShortener', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('starts with default empty state', () => {
    const { result } = renderHook(() => useUrlShortener());
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading while the request is in flight', () => {
    vi.mocked(urlActions.shortenUrl).mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(mockResult), 200)),
    );
    const { result } = renderHook(() => useUrlShortener());

    act(() => {
      result.current.shorten('https://example.com');
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('stores result and clears loading on success', async () => {
    vi.mocked(urlActions.shortenUrl).mockResolvedValueOnce(mockResult);
    const { result } = renderHook(() => useUrlShortener());

    await act(async () => {
      await result.current.shorten('https://example.com');
    });

    expect(result.current.result).toEqual(mockResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('stores error message and clears loading on failure', async () => {
    vi.mocked(urlActions.shortenUrl).mockRejectedValueOnce(
      new Error('Invalid URL'),
    );
    const { result } = renderHook(() => useUrlShortener());

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
    const { result } = renderHook(() => useUrlShortener());

    await act(async () => {
      await result.current.shorten('https://example.com');
    });

    expect(result.current.error).toBe('Failed to shorten URL');
  });

  it('resets all state when reset() is called', async () => {
    vi.mocked(urlActions.shortenUrl).mockResolvedValueOnce(mockResult);
    const { result } = renderHook(() => useUrlShortener());

    await act(async () => {
      await result.current.shorten('https://example.com');
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
