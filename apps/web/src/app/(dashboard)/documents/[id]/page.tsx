'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { api, DocumentItem } from '@/lib/api';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  MessageSquare,
  Bookmark,
} from 'lucide-react';

export default function DocumentViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id as string;
  const pageParam = searchParams.get('page');

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetPage, setTargetPage] = useState<number>(
    pageParam ? parseInt(pageParam, 10) : 1
  );
  const [inputPage, setInputPage] = useState<string>(
    pageParam ? pageParam : '1'
  );

  useEffect(() => {
    if (pageParam) {
      const p = parseInt(pageParam, 10);
      if (!isNaN(p)) {
        setTargetPage(p);
        setInputPage(p.toString());
      }
    }
  }, [pageParam]);

  useEffect(() => {
    async function loadDoc() {
      try {
        const res = await api.getDocument(id);
        setDocument(res.document);
      } catch (err: any) {
        setError(err.message || 'Failed to load document.');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadDoc();
    }
  }, [id]);

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p > 0) {
      setTargetPage(p);
      router.replace(`/documents/${id}?page=${p}`);
    }
  };

  const fileUrl = id ? api.getDocumentFileUrl(id) : '';
  const viewerUrl = `${fileUrl}#page=${targetPage}&view=FitH`;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/documents"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Back to documents"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-900 shrink-0" />
              <h1 className="text-sm font-semibold text-slate-900 truncate max-w-md">
                {document?.originalName || 'Document viewer'}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>
                {document?.pageCount
                  ? `${document.pageCount} ${document.pageCount === 1 ? 'page' : 'pages'}`
                  : 'Page count pending'}
              </span>
              <span>•</span>
              {document?.status === 'READY' && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </span>
              )}
              {document?.status === 'PROCESSING' && (
                <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing
                </span>
              )}
              {document?.status === 'FAILED' && (
                <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Page navigation & Action buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <form onSubmit={handlePageJump} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
            <span className="text-xs text-slate-500">Page</span>
            <input
              type="number"
              min="1"
              max={document?.pageCount || 9999}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              className="w-12 text-center text-xs bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
            {document?.pageCount ? (
              <span className="text-xs text-slate-500">of {document.pageCount}</span>
            ) : null}
            <button
              type="submit"
              className="text-xs px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-medium transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>

          <Link
            href={`/chat?documentId=${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-900" />
            <span>Ask question</span>
          </Link>

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Open in new tab</span>
          </a>
        </div>
      </div>

      {/* Referenced Citation Alert Banner */}
      {pageParam && (
        <div className="bg-blue-50/80 border-b border-blue-200/80 px-8 py-2 flex items-center justify-between text-xs text-blue-950">
          <div className="flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-blue-900" />
            <span>
              Navigated from research citation to <strong>Page {pageParam}</strong>.
            </span>
          </div>
          <span className="text-[11px] text-blue-700">
            Evidence grounded from document index
          </span>
        </div>
      )}

      {/* PDF Viewport */}
      <div className="flex-1 min-h-0 bg-slate-100 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading document viewer...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">Unable to view document</h3>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
              <div className="mt-4">
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to documents</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <iframe
              key={viewerUrl}
              src={viewerUrl}
              className="w-full h-full border-0"
              title={document?.originalName || 'PDF Viewer'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
