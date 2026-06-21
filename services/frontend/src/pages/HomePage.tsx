import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useUrlShortener } from '@/hooks/useUrlShortener';

const PENDING_URL_KEY = 'shortener.pendingUrl';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const { shorten, result, isLoading, error } = useUrlShortener(
    user?.userId ?? null,
  );
  const consumedPendingRef = useRef(false);

  // After a successful login, finish the shorten the user came here for.
  useEffect(() => {
    if (consumedPendingRef.current || !user) return;
    const pending = sessionStorage.getItem(PENDING_URL_KEY);
    if (!pending) return;
    consumedPendingRef.current = true;
    sessionStorage.removeItem(PENDING_URL_KEY);
    setUrl(pending);
    void shorten(pending).then(() => setUrl(''));
  }, [user, shorten]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!user) {
      sessionStorage.setItem(PENDING_URL_KEY, trimmed);
      navigate('/login');
      return;
    }
    await shorten(trimmed);
    setUrl('');
  };

  return (
    <main className="relative">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <BackgroundGlow />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/20 text-blue-200 text-xs font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Fast, simple URL shortening
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-5 tracking-tight leading-[1.05]">
            Shorten your links,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              amplify your reach
            </span>
          </h1>
          <p className="text-slate-300 text-lg sm:text-xl mb-10 max-w-xl mx-auto">
            Paste any URL, get a clean short link in seconds.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            <div className="bg-white/95 rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl ring-1 ring-white/10">
              <div className="flex-1 relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="url"
                  placeholder="https://example.com/very/long/url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-11 h-12 bg-transparent border-0 text-slate-900 placeholder:text-slate-400 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  required
                  aria-label="Long URL"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !url.trim()}
                size="lg"
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shrink-0 shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Shortening…
                  </>
                ) : (
                  <>
                    Shorten
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            {!user && (
              <p className="text-slate-400 text-sm mt-3">
                You'll be asked to sign in before we save it.
              </p>
            )}
          </form>

          {error && (
            <div
              role="alert"
              className="mt-5 max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm backdrop-blur-sm"
            >
              {error}
            </div>
          )}

          {result && <ShortResult shortUrl={result.shortUrl} />}
        </div>
      </section>
    </main>
  );
}

function BackgroundGlow() {
  return (
    <>
      <div
        aria-hidden
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[20rem] h-[20rem] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"
      />
    </>
  );
}

function ShortResult({ shortUrl }: { shortUrl: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-6 max-w-2xl mx-auto bg-white rounded-2xl p-4 shadow-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3">
        <div className="bg-green-100 rounded-lg p-2 shrink-0">
          <Check className="h-5 w-5 text-green-600" strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">
            Your short link
          </p>
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold text-base hover:text-blue-700 flex items-center gap-1.5 group"
          >
            <span className="truncate">{shortUrl}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        </div>
        <Button
          onClick={copy}
          variant={copied ? 'secondary' : 'default'}
          size="sm"
          className={`shrink-0 ${copied ? '' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
        <Link
          to="/dashboard"
          className="text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 font-medium"
        >
          See all your links
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
