import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RlsContext {
  /** Authenticated user's ID, or null for unauthenticated / service operations. */
  userId: string | null;
  /** When true, all RLS checks are bypassed (e.g. background jobs, webhooks). */
  bypass: boolean;
}

/**
 * Stores the current request's RLS context using Node's AsyncLocalStorage so
 * that PrismaService can inject the correct session variable before each query
 * without requiring explicit context passing through every service call.
 */
@Injectable()
export class RlsContextService {
  private readonly storage = new AsyncLocalStorage<RlsContext>();

  /** Returns the context for the current async context, or null if none. */
  getContext(): RlsContext | null {
    return this.storage.getStore() ?? null;
  }

  /**
   * Run `fn` with the given user ID as the RLS context.
   * All Prisma queries executed inside `fn` will have `app.current_user_id`
   * set to `userId`.
   */
  async runWithUser<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
    return this.storage.run({ userId, bypass: false }, fn);
  }

  /**
   * Run `fn` in service mode (RLS bypassed via `app.bypass_rls = 'on'`).
   * Use this for background jobs, webhooks, scheduled tasks, and admin
   * operations that must access data across user boundaries.
   */
  async runAsService<T>(fn: () => Promise<T>): Promise<T> {
    return this.storage.run({ userId: null, bypass: true }, fn);
  }
}
