import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/authContext';

export const metadata: Metadata = {
  title: 'Pharma AI — Pharmaceutical Research Workspace',
  description: 'Document-grounded pharmaceutical research assistant with verified citations and evidence retrieval.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
