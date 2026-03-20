/**
 * exportService — PDF generation utilities for Relevnt.
 *
 * jsPDF is intentionally NOT imported at the top level. It is a large library
 * (~500 KB minified, ~150 KB gzipped) that is only needed when the user
 * explicitly triggers a PDF export. A dynamic import defers that cost until
 * first use, keeping the initial bundle lean.
 *
 * Pattern mirrors the lazy-loading already used for pdfjs-dist and mammoth
 * in the rest of the codebase.
 */

import type { Application } from '../types/application';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PDFSummaryOptions {
  /** Title shown at the top of the PDF. Defaults to "Application Summary". */
  title?: string;
  /** Author metadata embedded in the PDF. */
  author?: string;
}

export interface ApplicationSummaryData {
  applications: Application[];
  generatedAt?: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats a date string to a human-readable label. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Returns a display-friendly label for an application status. */
function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    applied: 'Applied',
    reviewing: 'Reviewing',
    interviewing: 'Interviewing',
    in_review: 'In Review',
    offer: 'Offer Received',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };
  return labels[status] ?? status;
}

/**
 * Splits a long string into lines that fit within `maxWidth` pixels at the
 * current jsPDF font size. Uses the jsPDF instance's `splitTextToSize` helper.
 */
function wrapText(
  doc: { splitTextToSize: (text: string, width: number) => string[] },
  text: string,
  maxWidth: number,
): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

// ---------------------------------------------------------------------------
// Page layout constants
// ---------------------------------------------------------------------------

const PAGE_MARGIN = 20; // mm from each edge
const PAGE_WIDTH = 210; // A4 width in mm
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const LINE_HEIGHT = 6; // mm between text lines
const SECTION_GAP = 4; // mm between sections

// ---------------------------------------------------------------------------
// Core export function
// ---------------------------------------------------------------------------

/**
 * Generates a PDF summary of the provided job applications and triggers a
 * browser download.
 *
 * jsPDF is dynamically imported here — it is not bundled into the initial
 * chunk. The one-time ~150–300 ms load cost on first export is an acceptable
 * trade-off for keeping the initial page load fast.
 *
 * @param data   Application data to render in the PDF.
 * @param opts   Optional title / author metadata.
 * @returns      A promise that resolves when the download has been triggered.
 */
export async function generatePDFSummary(
  data: ApplicationSummaryData,
  opts: PDFSummaryOptions = {},
): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const {
    title = 'Application Summary',
    author = 'Relevnt',
  } = opts;

  const { applications, generatedAt = new Date() } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setProperties({ title, author, creator: 'Relevnt' });

  let y = PAGE_MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PAGE_MARGIN, y);
  y += 9;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated ${generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · ${applications.length} application${applications.length !== 1 ? 's' : ''}`,
    PAGE_MARGIN,
    y,
  );
  y += 2;

  // Horizontal rule beneath the header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, y + 2, PAGE_WIDTH - PAGE_MARGIN, y + 2);
  y += 8;

  doc.setTextColor(0, 0, 0);

  if (applications.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('No applications to display.', PAGE_MARGIN, y);
    doc.save('applications-summary.pdf');
    return;
  }

  // ── Application entries ─────────────────────────────────────────────────
  for (const app of applications) {
    // Estimate the block height to decide if we need a new page
    const estimatedHeight = 36;
    if (y + estimatedHeight > 280) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    // Role + Company
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const roleLines = wrapText(doc, app.role, CONTENT_WIDTH - 40);
    doc.text(roleLines, PAGE_MARGIN, y);
    const roleBlockHeight = roleLines.length * LINE_HEIGHT;

    // Status badge (right-aligned on the same row)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const statusLabel = formatStatus(app.status);
    const statusX = PAGE_WIDTH - PAGE_MARGIN - doc.getTextWidth(statusLabel) - 3;
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(statusLabel, statusX, y);

    y += roleBlockHeight;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(app.companyName, PAGE_MARGIN, y);
    y += LINE_HEIGHT;

    // Meta row: applied date + location + salary
    const meta: string[] = [`Applied ${formatDate(app.appliedAt)}`];
    if (app.location) meta.push(app.location);
    if (app.salary) meta.push(app.salary);

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(meta.join(' · '), PAGE_MARGIN, y);
    y += LINE_HEIGHT;

    // Notes (if present)
    if (app.notes) {
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const noteLines = wrapText(doc, app.notes, CONTENT_WIDTH);
      doc.text(noteLines, PAGE_MARGIN, y);
      y += noteLines.length * (LINE_HEIGHT - 1);
    }

    // Thin divider between entries
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(PAGE_MARGIN, y + SECTION_GAP / 2, PAGE_WIDTH - PAGE_MARGIN, y + SECTION_GAP / 2);
    y += SECTION_GAP + 2;
  }

  const filename = `applications-summary-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
