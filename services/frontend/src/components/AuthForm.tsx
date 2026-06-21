import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register';

interface AuthFormProps {
  mode: Mode;
  onSwitch: (mode: Mode) => void;
}

export default function AuthForm({ mode, onSwitch }: AuthFormProps) {
  const { login, register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError(null);
    setIsLoading(true);
    try {
      if (mode === 'login') await login(username, password);
      else await register(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const isLogin = mode === 'login';
  const title = isLogin ? 'Welcome back' : 'Create an account';
  const subtitle = isLogin
    ? 'Sign in to manage your shortened links.'
    : 'It takes about 10 seconds.';
  const submitLabel = isLogin ? 'Sign in' : 'Create account';
  const switchPrompt = isLogin ? "Don't have an account?" : 'Already have one?';
  const switchAction = isLogin ? 'Sign up' : 'Sign in';
  const switchTarget: Mode = isLogin ? 'register' : 'login';

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6 ring-1 ring-slate-200/60"
      aria-label={title}
    >
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="auth-username"
            className="text-xs font-medium text-slate-700 uppercase tracking-wide"
          >
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="auth-username"
              name="username"
              type="text"
              placeholder="3–20 chars, letters, digits, _"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              className="pl-10 h-11 bg-slate-50/60 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="auth-password"
            className="text-xs font-medium text-slate-700 uppercase tracking-wide"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={8}
              maxLength={64}
              className="pl-10 pr-10 h-11 bg-slate-50/60 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2"
        >
          <span className="font-medium">!</span>
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || !username.trim() || !password}
        className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isLogin ? 'Signing in…' : 'Creating account…'}
          </>
        ) : (
          submitLabel
        )}
      </Button>

      <p className="text-center text-sm text-slate-500">
        {switchPrompt}{' '}
        <button
          type="button"
          onClick={() => onSwitch(switchTarget)}
          className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
        >
          {switchAction}
        </button>
      </p>
    </form>
  );
}
