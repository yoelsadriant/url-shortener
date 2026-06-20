import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ShortenResult } from '@/types';

interface ResultCardProps {
  result: ShortenResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mt-4 bg-white/95 border-0 shadow-xl rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="text-xs font-medium mb-2">
              Shortened
            </Badge>
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold text-lg hover:text-blue-700 flex items-center gap-1.5 group w-fit"
            >
              {result.shortUrl}
              <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
          <Button
            onClick={handleCopy}
            variant={copied ? 'secondary' : 'default'}
            className={`shrink-0 gap-2 transition-all ${copied ? '' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
