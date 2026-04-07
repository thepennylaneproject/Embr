/**
 * RlsInterceptor Unit Tests
 * Verifies that the RLS context is populated correctly for HTTP and WebSocket
 * execution contexts, and that other context types are passed through unmodified.
 */

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { RlsInterceptor } from './rls.interceptor';
import { RlsContextService } from '../../core/database/rls-context.service';

function makeCallHandler(value: unknown = null): CallHandler {
  return { handle: jest.fn().mockReturnValue(of(value)) };
}

function makeContext(type: string, extra: Record<string, unknown> = {}): ExecutionContext {
  return {
    getType: jest.fn().mockReturnValue(type),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(extra.request ?? {}),
    }),
    switchToWs: jest.fn().mockReturnValue({
      getClient: jest.fn().mockReturnValue(extra.client ?? {}),
    }),
  } as unknown as ExecutionContext;
}

describe('RlsInterceptor', () => {
  let interceptor: RlsInterceptor;
  let rlsContext: jest.Mocked<RlsContextService>;

  beforeEach(() => {
    rlsContext = {
      runWithUser: jest.fn().mockImplementation((_userId, fn: () => Promise<void>) => fn()),
      runAsService: jest.fn(),
      getContext: jest.fn(),
    } as unknown as jest.Mocked<RlsContextService>;

    interceptor = new RlsInterceptor(rlsContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // HTTP context
  // ----------------------------------------------------------------

  describe('HTTP context', () => {
    it('should call runWithUser with authenticated user id', (done) => {
      const ctx = makeContext('http', { request: { user: { id: 'user-abc' } } });
      const handler = makeCallHandler('response');

      interceptor.intercept(ctx, handler).subscribe({
        next: (val) => {
          expect(val).toBe('response');
        },
        complete: () => {
          expect(rlsContext.runWithUser).toHaveBeenCalledWith('user-abc', expect.any(Function));
          done();
        },
      });
    });

    it('should call runWithUser with null for unauthenticated request', (done) => {
      const ctx = makeContext('http', { request: {} });
      const handler = makeCallHandler();

      interceptor.intercept(ctx, handler).subscribe({
        complete: () => {
          expect(rlsContext.runWithUser).toHaveBeenCalledWith(null, expect.any(Function));
          done();
        },
      });
    });
  });

  // ----------------------------------------------------------------
  // WebSocket context
  // ----------------------------------------------------------------

  describe('WebSocket (ws) context', () => {
    it('should call runWithUser with socket.userId for authenticated socket', (done) => {
      const ctx = makeContext('ws', { client: { userId: 'ws-user-123' } });
      const handler = makeCallHandler('ws-response');

      interceptor.intercept(ctx, handler).subscribe({
        next: (val) => {
          expect(val).toBe('ws-response');
        },
        complete: () => {
          expect(rlsContext.runWithUser).toHaveBeenCalledWith('ws-user-123', expect.any(Function));
          done();
        },
      });
    });

    it('should call runWithUser with null when socket has no userId', (done) => {
      const ctx = makeContext('ws', { client: {} });
      const handler = makeCallHandler();

      interceptor.intercept(ctx, handler).subscribe({
        complete: () => {
          expect(rlsContext.runWithUser).toHaveBeenCalledWith(null, expect.any(Function));
          done();
        },
      });
    });

    it('should forward observable values emitted by the handler', (done) => {
      const emitted: unknown[] = [];
      const ctx = makeContext('ws', { client: { userId: 'user-42' } });
      const handler = makeCallHandler('event-data');

      interceptor.intercept(ctx, handler).subscribe({
        next: (val) => emitted.push(val),
        complete: () => {
          expect(emitted).toEqual(['event-data']);
          done();
        },
      });
    });
  });

  // ----------------------------------------------------------------
  // Other / RPC contexts
  // ----------------------------------------------------------------

  describe('other (non-http, non-ws) contexts', () => {
    it('should bypass RLS and delegate directly to next.handle() for rpc context', (done) => {
      const ctx = makeContext('rpc');
      const handler = makeCallHandler('rpc-result');

      interceptor.intercept(ctx, handler).subscribe({
        next: (val) => {
          expect(val).toBe('rpc-result');
        },
        complete: () => {
          expect(rlsContext.runWithUser).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
