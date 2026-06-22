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
  customUrl?: string,
): Promise<ShortenResult> {
  const body: Record<string, string> = { url, userId };
  if (customUrl?.trim()) body.customUrl = customUrl.trim();

  const response = await fetch(`${API_URL}/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

export async function deleteUrl(code: string, userId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/url/${encodeURIComponent(code)}?user=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) throw new Error(await parseError(response));
}

export async function renameUrl(
  code: string,
  newCode: string,
  userId: string,
): Promise<ShortenResult> {
  const response = await fetch(
    `${API_URL}/url/${encodeURIComponent(code)}/rename?user=${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newCode }),
    },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<ShortenResult>;
}
