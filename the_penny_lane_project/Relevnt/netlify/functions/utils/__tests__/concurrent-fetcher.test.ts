/**
 * concurrent-fetcher.test.ts
 *
 * Unit tests for the concurrent-fetcher utility (PLP-14).
 *
 * Test requirements from the Linear issue:
 *   1. Status domain matches exactly the implemented paths: 'success', 'failed',
 *      'timeout' — all three are reachable through processTask.
 *   2. Explicit timeout classification: a task that exceeds its deadline must
 *      produce status 'timeout', not 'failed'.
 *   3. Tasks that throw non-timeout errors produce status 'failed'.
 *   4. Tasks that complete within the deadline produce status 'success'.
 *   5. concurrentFetch respects concurrency bounds and returns results in
 *      input order.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  processTask,
  concurrentFetch,
  type FetcherTask,
  type FetcherResult,
} from '../concurrent-fetcher';

// ---------------------------------------------------------------------------
// Timer control
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask<T>(
  id: string,
  run: (signal: AbortSignal) => Promise<T>,
): FetcherTask<T> {
  return { id, run };
}

/**
 * Returns a task whose Promise never settles unless the signal is aborted or
 * the test manually resolves it.  Useful for forcing timeouts via fake timers.
 */
function makeHangingTask(id: string): FetcherTask<never> {
  return makeTask(id, (signal) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
    }),
  );
}

// ---------------------------------------------------------------------------
// processTask — status domain
// ---------------------------------------------------------------------------

describe('processTask', () => {
  describe('status: success', () => {
    it('returns status success when the task resolves within the deadline', async () => {
      const task = makeTask('t1', async () => 'value');

      const resultPromise = processTask(task, 1000);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.status).toBe('success');
      expect(result.id).toBe('t1');
      expect(result.data).toBe('value');
      expect(result.error).toBeUndefined();
    });

    it('includes a non-negative durationMs on success', async () => {
      const task = makeTask('t2', async () => 42);

      const resultPromise = processTask(task, 1000);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('status: timeout', () => {
    it('returns status timeout when the task exceeds timeoutMs', async () => {
      const task = makeHangingTask('slow');

      const resultPromise = processTask(task, 500);

      // Advance fake timers past the timeout.
      await vi.advanceTimersByTimeAsync(501);

      const result = await resultPromise;

      expect(result.status).toBe('timeout');
      expect(result.id).toBe('slow');
      expect(result.data).toBeUndefined();
    });

    it('populates error with a descriptive message on timeout', async () => {
      const task = makeHangingTask('slow2');

      const resultPromise = processTask(task, 300);
      await vi.advanceTimersByTimeAsync(301);
      const result = await resultPromise;

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toMatch(/slow2/);
      expect(result.error?.message).toMatch(/300ms/);
    });

    it('passes an AbortSignal to the task so it can cancel downstream I/O', async () => {
      let capturedSignal: AbortSignal | undefined;

      const task = makeTask('signal-test', (signal) => {
        capturedSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        });
      });

      const resultPromise = processTask(task, 200);
      await vi.advanceTimersByTimeAsync(201);
      await resultPromise;

      expect(capturedSignal?.aborted).toBe(true);
    });

    it('does not emit timeout when the task finishes just before the deadline', async () => {
      const task = makeTask('fast', async () => 'done');

      const resultPromise = processTask(task, 100);
      // Task resolves immediately; advance timers but deadline should not fire.
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.status).toBe('success');
    });
  });

  describe('status: failed', () => {
    it('returns status failed when the task throws before the deadline', async () => {
      const task = makeTask('err', async () => {
        throw new Error('network error');
      });

      const resultPromise = processTask(task, 1000);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.status).toBe('failed');
      expect(result.error?.message).toBe('network error');
      expect(result.data).toBeUndefined();
    });

    it('wraps non-Error thrown values in an Error', async () => {
      const task = makeTask('str-throw', async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'something went wrong';
      });

      const resultPromise = processTask(task, 1000);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.status).toBe('failed');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('something went wrong');
    });

    it('does not misclassify an external abort as a timeout', async () => {
      // A separate AbortController owned by the caller — not the internal
      // timeout controller.
      const callerController = new AbortController();

      const task = makeTask('external-abort', (_signal) =>
        new Promise((_resolve, reject) => {
          callerController.signal.addEventListener('abort', () =>
            reject(callerController.signal.reason ?? new Error('aborted')),
          );
        }),
      );

      const resultPromise = processTask(task, 5000);

      // Abort externally before the 5 s deadline.
      callerController.abort(new Error('caller aborted'));
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      // Must be 'failed', not 'timeout', because our internal deadline did
      // not fire — a different AbortController triggered the rejection.
      expect(result.status).toBe('failed');
    });
  });

  describe('status domain completeness', () => {
    it('every result status is one of the three documented values', async () => {
      const VALID_STATUSES = new Set(['success', 'failed', 'timeout']);

      const tasks: FetcherTask<string>[] = [
        makeTask('ok', async () => 'ok'),
        makeTask('bad', async () => { throw new Error('boom'); }),
        makeHangingTask('hang'),
      ];

      const promises = tasks.map((t) => processTask(t, 100));
      await vi.advanceTimersByTimeAsync(101);
      const results = await Promise.all(promises);

      for (const r of results) {
        expect(VALID_STATUSES).toContain(r.status);
      }
    });

    it('all three status values are reachable through processTask', async () => {
      const statuses: Set<string> = new Set();

      const success = processTask(makeTask('s', async () => 'val'), 1000);
      await vi.runAllTimersAsync();
      statuses.add((await success).status);

      const failed = processTask(
        makeTask('f', async () => { throw new Error('err'); }),
        1000,
      );
      await vi.runAllTimersAsync();
      statuses.add((await failed).status);

      const timeout = processTask(makeHangingTask('t'), 100);
      await vi.advanceTimersByTimeAsync(101);
      statuses.add((await timeout).status);

      expect(statuses).toEqual(new Set(['success', 'failed', 'timeout']));
    });
  });
});

// ---------------------------------------------------------------------------
// concurrentFetch
// ---------------------------------------------------------------------------

describe('concurrentFetch', () => {
  it('returns an empty array for an empty input', async () => {
    const results = await concurrentFetch([]);
    expect(results).toEqual([]);
  });

  it('returns results in input order regardless of completion order', async () => {
    // Task 'b' resolves instantly; task 'a' takes longer.
    const order: string[] = [];

    const tasks: FetcherTask<string>[] = [
      makeTask('a', () => new Promise((res) => setTimeout(() => { order.push('a'); res('A'); }, 50))),
      makeTask('b', async () => { order.push('b'); return 'B'; }),
    ];

    const resultPromise = concurrentFetch(tasks, { timeoutMs: 200, concurrency: 2 });
    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(results[0].id).toBe('a');
    expect(results[1].id).toBe('b');
    expect(results[0].data).toBe('A');
    expect(results[1].data).toBe('B');
  });

  it('respects the concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;

    const tasks: FetcherTask<void>[] = Array.from({ length: 6 }, (_, i) =>
      makeTask(`t${i}`, () =>
        new Promise<void>((res) => {
          active++;
          maxActive = Math.max(maxActive, active);
          setTimeout(() => { active--; res(); }, 10);
        }),
      ),
    );

    const resultPromise = concurrentFetch(tasks, { timeoutMs: 500, concurrency: 3 });
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('classifies timed-out tasks as timeout in the combined result', async () => {
    const tasks: FetcherTask<string>[] = [
      makeTask('ok', async () => 'fine'),
      makeHangingTask('slow'),
    ];

    const resultPromise = concurrentFetch(tasks, { timeoutMs: 100, concurrency: 2 });
    await vi.advanceTimersByTimeAsync(101);
    const results: FetcherResult<string>[] = await resultPromise;

    const okResult = results.find((r) => r.id === 'ok')!;
    const slowResult = results.find((r) => r.id === 'slow')!;

    expect(okResult.status).toBe('success');
    expect(slowResult.status).toBe('timeout');
  });

  it('does not let one failing task affect others', async () => {
    const tasks: FetcherTask<string>[] = [
      makeTask('good', async () => 'ok'),
      makeTask('bad', async () => { throw new Error('oops'); }),
      makeTask('also-good', async () => 'also ok'),
    ];

    const resultPromise = concurrentFetch(tasks, { timeoutMs: 1000, concurrency: 3 });
    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(results[0].status).toBe('success');
    expect(results[1].status).toBe('failed');
    expect(results[2].status).toBe('success');
  });
});
