'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { FileText, ArrowRight, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    try {
      await register(email, password, name);
    } catch (err: any) {
      setError(err.message || 'Unable to register. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-[390px]">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-blue-900 text-white mb-3 shadow-xs">
            <FileText className="w-5 h-5 text-blue-100" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Create research account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Document-grounded pharmaceutical research workspace.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-7 shadow-xs">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Password (min. 6 characters)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-900 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-blue-900 hover:text-blue-950 hover:underline inline-flex items-center gap-0.5"
              >
                Sign in
                <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </div>

        {/* Subtle Disclaimer */}
        <p className="mt-8 text-center text-[11px] text-slate-400 leading-normal px-4">
          Pharma AI provides document-grounded research assistance and does not replace professional medical, clinical, regulatory, or scientific judgment.
        </p>
      </div>
    </div>
  );
}
