import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  if (isLoading) return null;
  // After login we send the user back to / so any URL they were trying to
  // shorten (saved in sessionStorage by HomePage) gets auto-submitted.
  if (user) return <Navigate to="/" replace />;

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-12">
      <AuthForm mode={mode} onSwitch={setMode} />
    </main>
  );
}
