'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center space-x-2 text-slate-500 text-sm">
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
        <span>Loading workspace...</span>
      </div>
    </div>
  );
}
