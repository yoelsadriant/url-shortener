import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getMyUrls } from '@/actions/urlActions';
import type { UrlRecord } from '@/types';

interface UrlListProps {
  userId: string;
  refreshKey?: number;
  onCountChange?: (count: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function UrlList({
  userId,
  refreshKey = 0,
  onCountChange,
}: UrlListProps) {
  const [urls, setUrls] = useState<UrlRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getMyUrls(userId);
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setUrls(items);
      onCountChange?.(items.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load URLs');
    } finally {
      setIsLoading(false);
    }
  }, [userId, onCountChange]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const filtered = query.trim()
    ? urls.filter((u) => {
        const q = query.toLowerCase();
        return (
          u.code.toLowerCase().includes(q) ||
          u.originUrl.toLowerCase().includes(q)
        );
      })
    : urls;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading your links…
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent
          role="alert"
          className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </CardContent>
      </Card>
    );
  }

  if (urls.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code or original URL…"
            className="pl-10 h-10 bg-white"
            aria-label="Search links"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          aria-label="Refresh"
          className="shrink-0"
        >
          <RefreshCw className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-8 text-sm">
          No links match "{query}".
        </p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((u) => (
            <li key={u.code}>
              <UrlRow url={u} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UrlRow({ url }: { url: UrlRecord }) {
  const shortUrl = `${API_URL}/${url.code}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="bg-blue-50 text-blue-600 rounded-lg p-2 shrink-0">
          <Link2 className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold text-base hover:text-blue-700 inline-flex items-center gap-1 max-w-full"
          >
            <span className="truncate">{shortUrl}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
          <p
            className="text-slate-500 text-sm truncate"
            title={url.originUrl}
          >
            {url.originUrl}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            {formatRelative(url.createdAt)}
          </p>
        </div>

        <Button
          onClick={handleCopy}
          variant={copied ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          aria-label={copied ? 'Copied' : 'Copy short URL'}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed bg-white/50">
      <CardContent className="text-center py-12 px-6">
        <div className="mx-auto bg-slate-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
          <Link2 className="h-5 w-5 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          No links yet
        </h3>
        <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
          Shorten your first URL and it'll show up here.
        </p>
        <Link to="/">
          <Button>Shorten a URL</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
}
