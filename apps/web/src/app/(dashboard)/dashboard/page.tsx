'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, DocumentItem } from '@/lib/api';
import UploadModal from '@/components/UploadModal';
import {
  FileText,
  Upload,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();

    const handleUploadEvent = () => fetchDocuments();
    window.addEventListener('documentUploaded', handleUploadEvent);
    return () => window.removeEventListener('documentUploaded', handleUploadEvent);
  }, [fetchDocuments]);

  // Periodic refresh if any document is processing
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'PROCESSING');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  // Statistics
  const totalCount = documents.length;
  const readyCount = documents.filter((d) => d.status === 'READY').length;
  const processingCount = documents.filter((d) => d.status === 'PROCESSING').length;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Research workspace
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review your documents and continue your research.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Research Chat</span>
          </Link>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload document</span>
          </button>
        </div>
      </div>

      {/* Useful Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Documents
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {loading ? '—' : totalCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Total uploaded files</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Ready
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-700">
            {loading ? '—' : readyCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Indexed & searchable</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Processing
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-700">
            {loading ? '—' : processingCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Extracting & indexing</p>
        </div>
      </div>

      {/* Recent Documents Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recent documents
            </h2>
          </div>
          {documents.length > 0 && (
            <Link
              href="/documents"
              className="text-xs font-medium text-blue-900 hover:text-blue-950 hover:underline inline-flex items-center gap-1"
            >
              <span>View all documents</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 mt-2">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 border-dashed rounded-lg p-12 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              Your research library is empty.
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload a PDF to start asking questions.
            </p>
            <div className="mt-5">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload document</span>
              </button>
            </div>
          </div>
        ) : (
          /* Recent Documents List */
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4 w-28">Pages</th>
                  <th className="py-3 px-4 w-32">Status</th>
                  <th className="py-3 px-4 w-36">Uploaded</th>
                  <th className="py-3 px-4 w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                        <span className="font-medium text-slate-800 truncate max-w-md">
                          {doc.originalName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.pageCount > 0 ? `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {doc.status === 'READY' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      )}
                      {doc.status === 'PROCESSING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing
                        </span>
                      )}
                      {doc.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-xs font-medium text-blue-900 hover:text-blue-950 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          fetchDocuments();
        }}
      />
    </div>
  );
}
