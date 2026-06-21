import { useCallback, useState } from 'react';
import { shortenUrl } from '@/actions/urlActions';
import type { ShortenResult } from '@/types';

interface State {
  result: ShortenResult | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseUrlShortenerReturn extends State {
  shorten: (url: string) => Promise<void>;
}

const initialState: State = { result: null, isLoading: false, error: null };

export function useUrlShortener(userId: string | null): UseUrlShortenerReturn {
  const [state, setState] = useState<State>(initialState);

  const shorten = useCallback(
    async (url: string) => {
      if (!userId) {
        setState({
          result: null,
          isLoading: false,
          error: 'You must be signed in to shorten URLs',
        });
        return;
      }
      setState({ result: null, isLoading: true, error: null });
      try {
        const result = await shortenUrl(url, userId);
        setState({ result, isLoading: false, error: null });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to shorten URL';
        setState({ result: null, isLoading: false, error: message });
      }
    },
    [userId],
  );

  return { ...state, shorten };
}
