'use client';

import React, { useState, useRef } from 'react';
import { api, DocumentItem } from '@/lib/api';
import {
  UploadCloud,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (doc: DocumentItem) => void;
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'processing' | 'ready' | 'failed';

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [state, setState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdDoc, setCreatedDoc] = useState<DocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setState('idle');
    setErrorMessage(null);
    setCreatedDoc(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Only PDF documents are supported.');
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25 MB limit.');
      return;
    }
    setFile(selectedFile);
    setState('selected');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const pollDocumentStatus = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await api.getDocument(id);
        if (res.document.status === 'READY') {
          clearInterval(interval);
          setState('ready');
          setCreatedDoc(res.document);
          onSuccess(res.document);
        } else if (res.document.status === 'FAILED') {
          clearInterval(interval);
          setState('failed');
          setErrorMessage(res.document.errorMessage || 'Text could not be extracted from this PDF.');
        }
      } catch (e) {
        // continue polling
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        // Still treat as processed in background
        setState('ready');
      }
    }, 1000);
  };

  const handleUpload = async () => {
    if (!file) return;
    setState('uploading');
    setErrorMessage(null);

    try {
      const res = await api.uploadDocument(file);
      setState('processing');
      setCreatedDoc(res.document);
      // Poll until ready
      pollDocumentStatus(res.document.id);
    } catch (err: any) {
      setState('failed');
      setErrorMessage(err.message || 'Failed to upload document.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Upload document</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a clinical trial report, drug monograph, or protocol PDF.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Idle or Selected */}
          {(state === 'idle' || state === 'selected') && (
            <>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-blue-700 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-2.5">
                  <UploadCloud className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-xs font-medium text-slate-800">
                  Click to choose a file or drag and drop
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  PDF format up to 25 MB
                </p>
              </div>

              {file && (
                <div className="mt-4 p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetState();
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Remove
                  </button>
                </div>
              )}
            </>
          )}

          {/* Uploading State */}
          {state === 'uploading' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-800">Uploading document...</p>
                <p className="text-xs text-slate-500 mt-0.5">Transferring PDF to workspace storage</p>
              </div>
            </div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-800">Processing document...</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Extracting pages, generating page-aware chunks, and indexing embeddings
                </p>
              </div>
            </div>
          )}

          {/* Ready State */}
          {state === 'ready' && (
            <div className="py-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Document ready</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {createdDoc?.originalName || file?.name} has been indexed.
                </p>
              </div>
            </div>
          )}

          {/* Failed State */}
          {state === 'failed' && (
            <div className="py-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Processing failed</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {errorMessage || 'Text could not be extracted from this PDF.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          {state === 'ready' ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors"
            >
              Done
            </button>
          ) : state === 'failed' ? (
            <>
              <button
                onClick={resetState}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
              >
                Try another file
              </button>
              <button
                onClick={handleClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={state === 'uploading' || state === 'processing'}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || state === 'uploading' || state === 'processing'}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {state === 'uploading' || state === 'processing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Upload document</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
