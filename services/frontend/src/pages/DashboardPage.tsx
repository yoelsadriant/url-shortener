import { useState } from 'react';
import { Calendar, Link2, User as UserIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import UrlList from '@/components/UrlList';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [linkCount, setLinkCount] = useState<number | null>(null);

  if (!user) return null;

  const initial = user.username.charAt(0).toUpperCase();
  const joined = new Date(user.createdAt);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <ProfileCard
        username={user.username}
        initial={initial}
        joined={joined}
        linkCount={linkCount}
      />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Your links
          </h2>
          {linkCount !== null && (
            <span className="text-sm text-slate-500">
              {linkCount} total
            </span>
          )}
        </div>
        <UrlList userId={user.userId} onCountChange={setLinkCount} />
      </section>
    </main>
  );
}

interface ProfileCardProps {
  username: string;
  initial: string;
  joined: Date;
  linkCount: number | null;
}

function ProfileCard({ username, initial, joined, linkCount }: ProfileCardProps) {
  const memberSince = joined.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card className="border-slate-200 overflow-hidden">
      <div className="h-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
      <CardContent className="px-6 pb-6 pt-0 -mt-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-4">
            <div
              className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-3xl font-bold shadow-lg ring-4 ring-white"
              aria-hidden
            >
              {initial}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {username}
              </h1>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
                Joined {memberSince}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <StatCard
            label="Short links"
            value={linkCount === null ? '—' : String(linkCount)}
            icon={<Link2 className="h-4 w-4" />}
          />
          <StatCard
            label="Account"
            value="Active"
            icon={<UserIcon className="h-4 w-4" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
