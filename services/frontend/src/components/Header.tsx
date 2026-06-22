import { Link2, LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const initial = user?.username.charAt(0).toUpperCase() ?? '?';

  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 group"
          aria-label="Home"
        >
          <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg p-1.5 shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">
            Shortener
          </span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-2 sm:gap-3">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'text-white bg-white/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              Shorten
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'text-white bg-white/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              My links
            </NavLink>
            <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
              <div
                className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white flex items-center justify-center text-sm font-semibold shadow-md"
                aria-hidden
              >
                {initial}
              </div>
              <span className="text-sm text-slate-200 font-medium max-w-[140px] truncate">
                {user.username}
              </span>
            </div>
            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
              aria-label="Sign out"
              className="text-slate-300 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </nav>
        ) : (
          <Link to="/login">
            <Button
              variant="default"
              size="sm"
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
