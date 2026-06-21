import type { ShortenResult, UrlRecord } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const msg = (body as { message?: string | string[] }).message;
  if (Array.isArray(msg)) return msg[0] ?? `Request failed (${res.status})`;
  return msg ?? `Request failed (${res.status})`;
}

export async function shortenUrl(
  url: string,
  userId: string,
): Promise<ShortenResult> {
  const response = await fetch(`${API_URL}/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, userId }),
  });

  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<ShortenResult>;
}

export async function getMyUrls(userId: string): Promise<UrlRecord[]> {
  const response = await fetch(
    `${API_URL}/url?user=${encodeURIComponent(userId)}`,
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<UrlRecord[]>;
}
