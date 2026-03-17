import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { RlsContextService } from './rls-context.service';

// Declaration merge: adds PrismaClient's typed model accessors (user, post, wallet, …)
// to PrismaService so that callers get full type-safety on Prisma operations.
// The actual runtime values are set via Object.defineProperty in the constructor.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PrismaService extends PrismaClient {}

/**
 * PrismaService wraps the Prisma client and automatically injects the RLS
 * session context before every query when the application connects as the
 * least-privilege `embr_app` role (subject to Row-Level Security).
 *
 * How it works
 * ────────────
 * A Prisma client extension (`$extends`) intercepts every model operation and
 * wraps it in a sequential `$transaction` together with a `set_config` call:
 *
 *   SELECT set_config('app.current_user_id', '<uuid>', true)   ← SET LOCAL
 *   <actual query>
 *
 * Both operations share the same PostgreSQL connection, so `SET LOCAL` is
 * scoped to that transaction and automatically reset when it commits.
 *
 * For unauthenticated or service-mode contexts the interceptor sets
 * `app.bypass_rls = 'on'` instead, which matches the service-bypass policy
 * defined on every table.
 *
 * Direct `withUserContext` / `withServiceContext` helpers are also exposed for
 * service code that needs to manage context explicitly (e.g. background jobs).
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /** Base Prisma client – connects as `embr_app`, subject to RLS. */
  private readonly base: PrismaClient;

  /**
   * Extended client that auto-injects the RLS context before every operation.
   * All model accessors (`this.user`, `this.post`, …) are delegated here via
   * `Object.assign` in the constructor so that callers can use
   * `prismaService.user.findMany()` without any changes.
   *
   * The model property types are provided via the interface declaration merge
   * below the class — this gives full Prisma delegate types (findMany, create, …)
   * on each model accessor without needing an `[key: string]: unknown` index
   * signature that would erase those types.
   */
  private readonly extended: ReturnType<PrismaClient['$extends']>;

  // Model proxy accessors are dynamically assigned in the constructor via Object.defineProperty.

  constructor(private readonly rlsContext: RlsContextService) {
    this.base = new PrismaClient();

    // Keep local references so the closure inside $extends uses `base` (not
    // the extended client) to avoid recursive middleware invocation.
    const base = this.base;
    const rlsCtx = this.rlsContext;

    this.extended = base.$extends({
      query: {
        $allModels: {
          async $allOperations({
            args,
            query,
          }: {
            args: unknown;
            query: (args: unknown) => Prisma.PrismaPromise<unknown>;
          }) {
            const ctx = rlsCtx.getContext();

            if (ctx?.bypass) {
              // Service mode – bypass RLS
              const [, result] = await base.$transaction([
                base.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
                query(args),
              ]);
              return result;
            }

            if (ctx?.userId) {
              // Authenticated user – enforce RLS with their ID
              const [, result] = await base.$transaction([
                base.$executeRaw`SELECT set_config('app.current_user_id', ${ctx.userId}, true)`,
                query(args),
              ]);
              return result;
            }

            // No context set (startup, health checks, etc.) – run as service bypass
            // to avoid breaking existing code paths that don't set context yet.
            const [, result] = await base.$transaction([
              base.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    });

    // Delegate all Prisma model properties (user, post, wallet, …) to the
    // extended client so existing service code works without modification.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const models = Object.keys(base).filter((k) => !k.startsWith('$') && !k.startsWith('_'));
    for (const model of models) {
      Object.defineProperty(self, model, {
        get() {
          return (self.extended as Record<string, unknown>)[model];
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.base.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.base.$disconnect();
  }

  // ── Raw query / transaction passthrough ────────────────────────────────────

  get $queryRaw() {
    return this.base.$queryRaw.bind(this.base);
  }

  get $executeRaw() {
    return this.base.$executeRaw.bind(this.base);
  }

  get $transaction() {
    return this.base.$transaction.bind(this.base);
  }

  // ── Explicit context helpers ───────────────────────────────────────────────

  /**
   * Run `fn` inside a PostgreSQL transaction with `app.current_user_id` set to
   * `userId`. Use for sensitive multi-step operations where you need both RLS
   * enforcement and atomicity.
   *
   * @example
   * const result = await this.prisma.withUserContext(userId, (tx) =>
   *   tx.wallet.update({ where: { userId }, data: { balance: newBalance } }),
   * );
   */
  async withUserContext<T>(
    userId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.base.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
      return fn(tx);
    });
  }

  /**
   * Run `fn` inside a PostgreSQL transaction with RLS bypassed
   * (`app.bypass_rls = 'on'`).  Use for administrative or background operations
   * that must cross user boundaries (e.g. notification fanout, billing jobs).
   */
  async withServiceContext<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.base.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      return fn(tx);
    });
  }
}

/**
 * Declaration merging: adds all Prisma model delegate properties (user, post,
 * wallet, …) to PrismaService so that callers get full type-safe access to
 * every model operation (findMany, create, update, …).
 *
 * The conflicting lifecycle / raw-query / extension methods ($on, $connect,
 * $disconnect, $use, $extends, $transaction, $executeRaw, $executeRawUnsafe,
 * $queryRaw, $queryRawUnsafe) are omitted here because PrismaService defines
 * its own implementations for them as class getters / methods.
 *
 * The actual runtime implementations are installed in the constructor via
 * Object.defineProperty, delegating to the RLS-aware `extended` client.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PrismaService
  extends Omit<
    PrismaClient,
    | '$on'
    | '$connect'
    | '$disconnect'
    | '$use'
    | '$extends'
    | '$transaction'
    | '$executeRaw'
    | '$executeRawUnsafe'
    | '$queryRaw'
    | '$queryRawUnsafe'
  > {}
