import { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ResultCard from '@/components/ResultCard';
import { useUrlShortener } from '@/hooks/useUrlShortener';

export default function UrlShortenerForm() {
  const [url, setUrl] = useState('');
  const { shorten, result, isLoading, error } = useUrlShortener();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    await shorten(trimmed);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 flex gap-2 border border-white/20"
      >
        <div className="flex-1 relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="url"
            placeholder="Paste your long URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10 h-12 bg-white text-slate-900 border-0 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-blue-500"
            required
            aria-label="Long URL"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          size="lg"
          className="h-12 px-6 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Shortening...
            </>
          ) : (
            'Shorten URL'
          )}
        </Button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm"
        >
          {error}
        </div>
      )}

      {result && <ResultCard result={result} />}
    </div>
  );
}
