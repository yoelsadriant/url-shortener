import type { ShortenResult } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function shortenUrl(url: string): Promise<ShortenResult> {
  const response = await fetch(`${API_URL}/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ??
        `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<ShortenResult>;
}
