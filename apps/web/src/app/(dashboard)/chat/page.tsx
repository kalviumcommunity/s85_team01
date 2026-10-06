'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, DocumentItem, Citation, MessageItem } from '@/lib/api';
import {
  Send,
  FileText,
  Bookmark,
  ExternalLink,
  Loader2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function ResearchChatPage() {
  const searchParams = useSearchParams();
  const initialDocId = searchParams.get('documentId');

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load documents
  useEffect(() => {
    async function loadDocs() {
      try {
        const res = await api.getDocuments();
        setDocuments(res.documents);
        if (initialDocId) {
          const match = res.documents.find((d) => d.id === initialDocId);
          if (match) {
            setSelectedDocId(match.id);
          }
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setDocLoading(false);
      }
    }
    loadDocs();
  }, [initialDocId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const readyDocuments = documents.filter((d) => d.status === 'READY');

  const handleSend = async (questionText?: string) => {
    const text = questionText || inputQuery;
    if (!text || text.trim().length === 0 || loading) return;

    const trimmed = text.trim();
    setInputQuery('');

    // Append user message immediately
    const userMsg: MessageItem = {
      id: `temp-u-${Date.now()}`,
      conversationId: conversationId || '',
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const docIds = selectedDocId === 'all' ? undefined : [selectedDocId];
      const res = await api.sendChat(trimmed, docIds, conversationId);

      setConversationId(res.conversationId);

      const assistantMsg: MessageItem = {
        id: res.messageId,
        conversationId: res.conversationId,
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `temp-err-${Date.now()}`,
        conversationId: conversationId || '',
        role: 'assistant',
        content:
          err.message ||
          "I couldn't find enough information to answer this question from your uploaded documents.",
        citations: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const exampleQuestions = [
    'What was the primary endpoint of the study?',
    'What were the inclusion criteria?',
    'What adverse events were reported?',
    'What was the study population?',
  ];

  const selectedDocumentName =
    selectedDocId === 'all'
      ? 'All documents'
      : documents.find((d) => d.id === selectedDocId)?.originalName || 'Selected document';

  return (
    <div className="flex h-full bg-[#f8fafc] overflow-hidden">
      {/* Left sub-sidebar for Documents Filter */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Documents</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Scope query to specific research files
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* All documents option */}
          <button
            onClick={() => setSelectedDocId('all')}
            className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between ${
              selectedDocId === 'all'
                ? 'bg-blue-50/80 text-blue-950 font-medium border border-blue-200/60'
                : 'text-slate-700 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className="truncate">All documents</div>
            <span className="text-[10px] text-slate-400 ml-1">
              ({readyDocuments.length})
            </span>
          </button>

          {/* List of individual ready documents */}
          {docLoading ? (
            <div className="py-4 text-center">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin mx-auto" />
            </div>
          ) : readyDocuments.length === 0 ? (
            <div className="p-3 text-[11px] text-slate-400 text-center leading-normal">
              No ready documents found. Upload a PDF to start asking questions.
            </div>
          ) : (
            readyDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${
                  selectedDocId === doc.id
                    ? 'bg-blue-50/80 text-blue-950 font-medium border border-blue-200/60'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
                title={doc.originalName}
              >
                <FileText className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                <div className="truncate min-w-0 flex-1">
                  <div className="truncate">{doc.originalName}</div>
                  <div className="text-[10px] text-slate-400">
                    {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">Research Chat</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ask questions about your uploaded documents.
            </p>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            Scope: <span className="font-medium text-slate-800">{selectedDocumentName}</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-blue-900 mx-auto flex items-center justify-center mb-3">
                <HelpCircle className="w-5 h-5 text-blue-900" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Research Chat
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Ask questions about your uploaded documents. Answers are strictly grounded with verified citations and evidence.
              </p>

              {/* Subtle Example Questions */}
              <div className="mt-8 text-left max-w-lg mx-auto">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
                  Example questions
                </div>
                <div className="space-y-2">
                  {exampleQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="w-full text-left px-3.5 py-2.5 rounded-md bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-700 transition-colors flex items-center justify-between group shadow-2xs"
                    >
                      <span>{q}</span>
                      <span className="text-blue-900 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Ask →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Messages */
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  {/* User Message */}
                  {msg.role === 'user' && (
                    <div className="flex justify-end">
                      <div className="max-w-xl bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs leading-relaxed shadow-2xs">
                        {msg.content}
                      </div>
                    </div>
                  )}

                  {/* Assistant Message */}
                  {msg.role === 'assistant' && (
                    <div className="flex justify-start">
                      <div className="w-full bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                        {/* Answer Text */}
                        <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                          {msg.content}
                        </div>

                        {/* Citations / Sources Section */}
                        {msg.citations && msg.citations.length > 0 ? (
                          <div className="pt-3 border-t border-slate-100 space-y-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              <Bookmark className="w-3.5 h-3.5 text-blue-900" />
                              <span>Sources</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                              {msg.citations.map((cite, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                                      <span className="font-medium text-slate-800 truncate">
                                        {cite.documentName}
                                      </span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shrink-0">
                                      Page {cite.pageNumber}
                                    </span>
                                  </div>

                                  {/* Evidence Excerpt */}
                                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-150 italic leading-relaxed">
                                    "{cite.evidence}"
                                  </p>

                                  {/* View Source Button */}
                                  <div className="pt-0.5 flex justify-end">
                                    <Link
                                      href={`/documents/${cite.documentId}?page=${cite.pageNumber}`}
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-900 hover:text-blue-950 hover:underline"
                                    >
                                      <span>View source</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* No Evidence Found */
                          <div className="pt-2 text-[11px] text-slate-400 italic flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                            <span>No supporting evidence found.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking / Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-2.5 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 text-blue-900 animate-spin" />
                    <span>Searching document evidence and generating grounded response...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="bg-white border-t border-slate-200 px-8 py-3.5 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                disabled={loading}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask a question about your research..."
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-900 focus:border-blue-900 focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
