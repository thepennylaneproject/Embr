import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase client (browser-side, public anon key)
// ---------------------------------------------------------------------------

function getSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface ResumeDocument {
  id: string;
  user_id: string;
  /** Display name — may be null if the user has not set one yet. */
  title: string | null;
  file_url: string | null;
  raw_text: string | null;
  skills_extracted: string[] | null;
  created_at: string | null;
}

/** Derives a human-readable label from the raw file_url when title is absent. */
export function labelForResume(resume: ResumeDocument): string {
  if (resume.title) return resume.title;
  if (resume.file_url) {
    const parts = resume.file_url.split('/');
    return decodeURIComponent(parts[parts.length - 1] ?? 'Resume');
  }
  return 'Untitled resume';
}

// ---------------------------------------------------------------------------
// Lightweight toast (no third-party library required)
// ---------------------------------------------------------------------------

type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

let _toastSeq = 0;

interface ToastRegion {
  push: (message: string, variant: ToastVariant) => void;
}

function useToastRegion(): [ToastItem[], ToastRegion] {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = ++_toastSeq;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return [toasts, { push }];
}

interface ToastRegionProps {
  toasts: ToastItem[];
}

function ToastRegion({ toasts }: ToastRegionProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="assertive"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm shadow-lg max-w-xs ${
            t.variant === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {t.variant === 'success' ? (
            <svg aria-hidden="true" className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.78 5.28a.75.75 0 00-1.06-1.06L7 8.94 5.28 7.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0V5zm.75 6.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useResumes hook
// ---------------------------------------------------------------------------

interface UseResumesResult {
  resumes: ResumeDocument[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useResumes(supabase: SupabaseClient): UseResumesResult {
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setResumes([]);
    } else {
      setResumes((data as ResumeDocument[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return { resumes, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// RenameDialog
// ---------------------------------------------------------------------------

interface RenameDialogProps {
  resume: ResumeDocument;
  onConfirm: (newTitle: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function RenameDialog({ resume, onConfirm, onCancel, isSaving }: RenameDialogProps) {
  const inputId = useId();
  const [value, setValue] = useState(resume.title ?? labelForResume(resume));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 id="rename-dialog-title" className="text-base font-semibold text-gray-900 mb-4">
          Rename resume
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            New name
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isSaving}
          />
          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !value.trim()}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentsPage
// ---------------------------------------------------------------------------

interface DocumentsPageProps {
  /** Supabase client override — for testing only. Omit in production. */
  supabaseClient?: SupabaseClient;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ supabaseClient }) => {
  const supabase = supabaseClient ?? getSupabase();
  const { resumes, loading, error: loadError, reload } = useResumes(supabase);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, toast] = useToastRegion();

  const renamingResume = resumes.find((r) => r.id === renamingId) ?? null;

  async function handleRenameConfirm(newTitle: string) {
    if (!renamingId) return;
    setIsSaving(true);

    const { error: updateError } = await supabase
      .from('resumes')
      .update({ title: newTitle })
      .eq('id', renamingId);

    setIsSaving(false);

    if (updateError) {
      toast.push(
        `Could not rename resume: ${updateError.message}`,
        'error',
      );
      return;
    }

    setRenamingId(null);
    toast.push('Resume renamed successfully.', 'success');
    reload();
  }

  function handleRenameCancel() {
    setRenamingId(null);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage the resumes attached to your profile.
          </p>
        </div>

        {/* Load error banner */}
        {loadError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          >
            <svg aria-hidden="true" className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0V5zm.75 6.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <span className="font-medium">Could not load documents.</span>{' '}
              {loadError}
            </div>
            <button
              onClick={reload}
              className="shrink-0 font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content area */}
        {loading ? (
          <div aria-label="Loading documents…" role="status" className="space-y-4">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse flex items-center justify-between gap-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/5" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="h-8 bg-gray-200 rounded-lg w-20" />
              </div>
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <div
            role="status"
            aria-label="No documents found"
            className="flex flex-col items-center justify-center py-20 px-6 text-center"
          >
            <svg aria-hidden="true" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="14" y="10" width="44" height="60" rx="4" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
              <rect x="22" y="24" width="28" height="4" rx="2" fill="#6366F1" opacity="0.4" />
              <rect x="22" y="33" width="20" height="4" rx="2" fill="#6366F1" opacity="0.3" />
              <rect x="22" y="42" width="24" height="4" rx="2" fill="#6366F1" opacity="0.2" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">No resumes yet</h2>
            <p className="text-gray-500 max-w-sm">
              Upload a resume to get started. Relevnt will use it to match you with relevant opportunities.
            </p>
          </div>
        ) : (
          <div role="list" aria-label={`${resumes.length} document${resumes.length !== 1 ? 's' : ''}`} className="space-y-4">
            {resumes.map((resume) => {
              const label = labelForResume(resume);
              const uploadedAt = resume.created_at
                ? new Date(resume.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : null;

              return (
                <div
                  key={resume.id}
                  role="listitem"
                  className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg aria-hidden="true" className="shrink-0 text-indigo-400" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                      {uploadedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">Uploaded {uploadedAt}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setRenamingId(resume.id)}
                    aria-label={`Rename ${label}`}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Rename
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rename dialog */}
      {renamingResume && (
        <RenameDialog
          resume={renamingResume}
          onConfirm={handleRenameConfirm}
          onCancel={handleRenameCancel}
          isSaving={isSaving}
        />
      )}

      {/* Toast region */}
      <ToastRegion toasts={toasts} />
    </main>
  );
};

export default DocumentsPage;
