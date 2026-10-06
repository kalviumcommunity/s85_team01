'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  LogOut,
  FlaskConical,
} from 'lucide-react';

interface SidebarProps {
  onOpenUpload?: () => void;
}

export default function Sidebar({ onOpenUpload }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Documents',
      href: '/documents',
      icon: FileText,
    },
    {
      label: 'Research Chat',
      href: '/chat',
      icon: MessageSquare,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-blue-900 flex items-center justify-center text-white shadow-xs">
            <FlaskConical className="w-4 h-4 text-blue-100" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight text-slate-900 block leading-tight">
              Pharma AI
            </span>
            <span className="text-[11px] text-slate-500 block leading-none mt-0.5">
              Research Assistant
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-5 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-600">
          Workspace
        </div>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/documents' && pathname.startsWith('/documents/'));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50/70 text-blue-950 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-blue-900' : 'text-slate-400'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User & Logout section */}
      <div className="p-4 border-t border-slate-100">
        <div className="px-2 py-2 mb-2 flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <div className="text-xs font-medium text-slate-800 truncate">
              {user?.name || 'Researcher'}
            </div>
            <div className="text-[11px] text-slate-600 truncate">
              {user?.email}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
