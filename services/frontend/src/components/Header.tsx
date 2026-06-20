import { Link2 } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 rounded-lg p-1.5">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900">Shortener</span>
        </div>
      </div>
    </header>
  );
}
