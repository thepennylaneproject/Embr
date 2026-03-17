// @vitest-environment jsdom
/**
 * DocumentsPage.test.tsx
 *
 * Component tests for the resume rename flow (PLP-11).
 *
 * Requirements:
 *   1. Failed rename surfaces error feedback via a toast message.
 *   2. Successful rename reloads the list and reflects the new title.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { DocumentsPage, type ResumeDocument } from '../DocumentsPage';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

type UpdateChain = {
  eq: ReturnType<typeof vi.fn>;
};

interface MockSupabaseOptions {
  /** Rows returned by the initial .select() fetch */
  selectData?: ResumeDocument[];
  /** Error returned by the initial .select() fetch */
  selectError?: { message: string } | null;
  /** Error returned by .update()…eq() — null means success */
  updateError?: { message: string } | null;
  /** Rows returned after a reload (second call to .select()) */
  reloadData?: ResumeDocument[];
}

function buildMockSupabase(opts: MockSupabaseOptions = {}): SupabaseClient {
  const {
    selectData = [],
    selectError = null,
    updateError = null,
    reloadData,
  } = opts;

  let selectCallCount = 0;

  const fromImpl = (table: string) => {
    if (table !== 'resumes') {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockImplementation(() => {
          selectCallCount += 1;
          const data =
            reloadData !== undefined && selectCallCount > 1
              ? reloadData
              : selectData;
          return Promise.resolve({ data, error: selectError });
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: updateError }),
      } as UpdateChain),
    };
  };

  return { from: vi.fn(fromImpl) } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RESUME_A: ResumeDocument = {
  id: 'resume-1',
  user_id: 'user-1',
  title: 'My Resume v1',
  file_url: 'https://storage.example.com/resume-1.pdf',
  raw_text: null,
  skills_extracted: null,
  created_at: '2026-01-15T12:00:00Z',
};

const RESUME_A_RENAMED: ResumeDocument = {
  ...RESUME_A,
  title: 'My Resume v2',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage(supabase: SupabaseClient) {
  return render(<DocumentsPage supabaseClient={supabase} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocumentsPage — resume rename flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    cleanup();
  });

  describe('failed rename', () => {
    it('surfaces an error toast when the Supabase update returns an error', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      const supabase = buildMockSupabase({
        selectData: [RESUME_A],
        updateError: { message: 'Row not found or permission denied' },
      });

      renderPage(supabase);

      // Wait for the resume to appear in the list
      await screen.findByText('My Resume v1');

      // Open the rename dialog
      await user.click(screen.getByRole('button', { name: /rename my resume v1/i }));

      // Verify the dialog is shown
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Clear the input and type a new name
      const input = screen.getByLabelText(/new name/i);
      await user.clear(input);
      await user.type(input, 'Attempted New Name');

      // Submit the rename
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      // Error toast must appear
      await waitFor(() => {
        expect(
          screen.getByText(/could not rename resume: row not found or permission denied/i),
        ).toBeInTheDocument();
      });

      // The rename dialog should still be open (not dismissed on error)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not reload the resume list after a failed rename', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      const supabase = buildMockSupabase({
        selectData: [RESUME_A],
        updateError: { message: 'Network timeout' },
      });

      renderPage(supabase);
      await screen.findByText('My Resume v1');

      await user.click(screen.getByRole('button', { name: /rename my resume v1/i }));
      const input = screen.getByLabelText(/new name/i);
      await user.clear(input);
      await user.type(input, 'Failed Rename');
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(screen.getByText(/could not rename resume/i)).toBeInTheDocument();
      });

      // from() should have been called twice: once for initial load, once for update.
      // A third call would indicate an unwanted reload after the error.
      const fromMock = supabase.from as ReturnType<typeof vi.fn>;
      const allFromCalls: string[] = fromMock.mock.calls.map(
        (args: unknown[]) => args[0] as string,
      );
      const resumesCalls = allFromCalls.filter((t) => t === 'resumes');
      // Initial load = 1 call; update = 1 call. No extra reload expected.
      // At most 2 calls: initial load + update (not a third "reload" call).
      expect(resumesCalls.length).toBeLessThanOrEqual(2);
      // The title on screen should be unchanged
      expect(screen.getByText('My Resume v1')).toBeInTheDocument();
    });
  });

  describe('successful rename', () => {
    it('closes the dialog, shows a success toast, and reloads the list with the new title', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      const supabase = buildMockSupabase({
        selectData: [RESUME_A],
        updateError: null,
        reloadData: [RESUME_A_RENAMED],
      });

      renderPage(supabase);

      // Wait for the resume list to load
      await screen.findByText('My Resume v1');

      // Click Rename
      await user.click(screen.getByRole('button', { name: /rename my resume v1/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Replace name and submit
      const input = screen.getByLabelText(/new name/i);
      await user.clear(input);
      await user.type(input, 'My Resume v2');
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Success toast must appear
      await waitFor(() => {
        expect(screen.getByText(/resume renamed successfully/i)).toBeInTheDocument();
      });

      // List should reflect the new title returned by the reload
      await waitFor(() => {
        expect(screen.getByText('My Resume v2')).toBeInTheDocument();
      });

      expect(screen.queryByText('My Resume v1')).not.toBeInTheDocument();
    });

    it('calls supabase update with the trimmed new title', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      const supabase = buildMockSupabase({
        selectData: [RESUME_A],
        updateError: null,
        reloadData: [RESUME_A_RENAMED],
      });

      renderPage(supabase);
      await screen.findByText('My Resume v1');

      await user.click(screen.getByRole('button', { name: /rename my resume v1/i }));
      const input = screen.getByLabelText(/new name/i);
      await user.clear(input);
      // Type with surrounding whitespace — should be trimmed
      await user.type(input, '  My Resume v2  ');
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify the update was called with the trimmed value
      const fromMock = supabase.from as ReturnType<typeof vi.fn>;
      const updateMock = fromMock.mock.results[1]?.value?.update as
        | ReturnType<typeof vi.fn>
        | undefined;
      expect(updateMock).toBeDefined();
      expect(updateMock?.mock.calls[0]?.[0]).toEqual({ title: 'My Resume v2' });
    });
  });
});
