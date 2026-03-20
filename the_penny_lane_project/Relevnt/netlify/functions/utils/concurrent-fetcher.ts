/**
 * netlify/functions/utils/concurrent-fetcher.ts
 *
 * Generic concurrent task runner with per-task timeout classification.
 *
 * Each task receives an AbortSignal so it can propagate cancellation to
 * downstream fetch() calls or other async work.  When the per-task deadline
 * fires the signal is aborted with a TaskTimeoutError, and processTask
 * detects this to emit status: 'timeout' — distinct from a general failure.
 *
 * Status domain:
 *   'success'  — task resolved before the deadline.
 *   'timeout'  — task did not finish within timeoutMs.
 *   'failed'   — task threw an error unrelated to the timeout.
 *
 * Usage:
 *   const results = await concurrentFetch(
 *     tasks,
 *     { timeoutMs: 5000, concurrency: 4 },
 *   );
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FetcherStatus = 'success' | 'failed' | 'timeout';

export interface FetcherResult<T> {
  /** Caller-supplied identifier for the task. */
  id: string;
  status: FetcherStatus;
  /** Present when status === 'success'. */
  data?: T;
  /** Present when status === 'failed' or 'timeout'. */
  error?: Error;
  /** Wall-clock milliseconds from task start to settlement. */
  durationMs: number;
}

export interface FetcherTask<T> {
  id: string;
  /** Function that performs the async work.  Receives an AbortSignal so it
   *  can forward cancellation to fetch() or other I/O. */
  run: (signal: AbortSignal) => Promise<T>;
}

export interface ConcurrentFetchOptions {
  /** Per-task timeout in milliseconds.  Defaults to 10 000. */
  timeoutMs?: number;
  /** Maximum number of tasks running at the same time.  Defaults to 5. */
  concurrency?: number;
}

// ---------------------------------------------------------------------------
// Internal sentinel — distinguishes our timeout abort from all other errors
// ---------------------------------------------------------------------------

class TaskTimeoutError extends Error {
  constructor(taskId: string, timeoutMs: number) {
    super(`Task "${taskId}" timed out after ${timeoutMs}ms`);
    this.name = 'TaskTimeoutError';
  }
}

// ---------------------------------------------------------------------------
// processTask
// ---------------------------------------------------------------------------

/**
 * Runs a single task, enforcing the per-task deadline.
 *
 * When the deadline fires, the AbortController is aborted with a
 * TaskTimeoutError.  If the task (or any downstream fetch) respects the
 * AbortSignal it will throw an AbortError, which processTask converts to
 * status: 'timeout'.  Any other thrown value becomes status: 'failed'.
 */
export async function processTask<T>(
  task: FetcherTask<T>,
  timeoutMs: number,
): Promise<FetcherResult<T>> {
  const start = Date.now();
  const controller = new AbortController();

  const timeoutHandle = setTimeout(() => {
    controller.abort(new TaskTimeoutError(task.id, timeoutMs));
  }, timeoutMs);

  try {
    const data = await task.run(controller.signal);

    return {
      id: task.id,
      status: 'success',
      data,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const durationMs = Date.now() - start;

    // Classify as 'timeout' when our own deadline aborted the controller.
    // We check signal.aborted AND that the abort reason is our sentinel so
    // that a caller-cancelled signal (different AbortController) still maps
    // to 'failed', not 'timeout'.
    if (
      controller.signal.aborted &&
      controller.signal.reason instanceof TaskTimeoutError
    ) {
      return {
        id: task.id,
        status: 'timeout',
        error: controller.signal.reason,
        durationMs,
      };
    }

    return {
      id: task.id,
      status: 'failed',
      error: err instanceof Error ? err : new Error(String(err)),
      durationMs,
    };
  } finally {
    // Prevent stale abort after a fast completion.
    clearTimeout(timeoutHandle);
  }
}

// ---------------------------------------------------------------------------
// concurrentFetch
// ---------------------------------------------------------------------------

/**
 * Runs all tasks concurrently, bounded by `concurrency`, and returns one
 * FetcherResult per task in input order.
 */
export async function concurrentFetch<T>(
  tasks: FetcherTask<T>[],
  options: ConcurrentFetchOptions = {},
): Promise<FetcherResult<T>[]> {
  const { timeoutMs = 10_000, concurrency = 5 } = options;

  if (tasks.length === 0) return [];

  const results: FetcherResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await processTask(tasks[index], timeoutMs);
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
