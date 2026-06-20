import { useState, useCallback } from 'react';
import { shortenUrl } from '@/actions/urlActions';
import type { ShortenResult } from '@/types';

interface State {
  result: ShortenResult | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseUrlShortenerReturn extends State {
  shorten: (url: string) => Promise<void>;
  reset: () => void;
}

const initialState: State = { result: null, isLoading: false, error: null };

export function useUrlShortener(): UseUrlShortenerReturn {
  const [state, setState] = useState<State>(initialState);

  const shorten = useCallback(async (url: string) => {
    setState({ result: null, isLoading: true, error: null });
    try {
      const result = await shortenUrl(url);
      setState({ result, isLoading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to shorten URL';
      setState({ result: null, isLoading: false, error: message });
    }
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, shorten, reset };
}
