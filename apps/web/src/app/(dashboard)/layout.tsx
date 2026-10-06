'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Sidebar from '@/components/Sidebar';
import UploadModal from '@/components/UploadModal';
import { Plus, ShieldCheck } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
          <span>Verifying research session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Sidebar */}
      <Sidebar onOpenUpload={() => setIsUploadOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-800">Pharmaceutical Research</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
              <span>Grounded Evidence Mode</span>
            </div>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload document</span>
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-[#f8fafc]">
          {children}
        </main>

        {/* Medical Disclaimer Footer */}
        <footer className="py-2.5 px-8 bg-white border-t border-slate-200 shrink-0 text-center">
          <p className="text-[11px] text-slate-600">
            Pharma AI provides document-grounded research assistance and does not replace professional medical, clinical, regulatory, or scientific judgment.
          </p>
        </footer>
      </div>

      {/* Global Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          // Trigger custom event or page reload if needed
          window.dispatchEvent(new Event('documentUploaded'));
        }}
      />
    </div>
  );
}
