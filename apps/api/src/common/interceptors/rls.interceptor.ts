import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RlsContextService } from '../../core/database/rls-context.service';

/**
 * Global interceptor that populates the RLS context before any service/database
 * code runs.
 *
 * - HTTP authenticated requests:   sets `app.current_user_id` to `request.user.id`
 * - HTTP unauthenticated requests: sets `app.current_user_id` to '' (public-data policies apply)
 * - WebSocket / RPC contexts:      runs as explicit service context (RLS bypassed)
 *
 * Register this as a global APP_INTERCEPTOR in AppModule.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly rlsContext: RlsContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      // WebSocket / RPC contexts: run as explicit service context so Prisma
      // operations have an intentional RLS scope rather than failing closed.
      return new Observable((subscriber) => {
        this.rlsContext
          .runAsService(() =>
            new Promise<void>((resolve, reject) => {
              next
                .handle()
                .subscribe({
                  next: (value) => subscriber.next(value),
                  error: (err) => {
                    reject(err);
                    subscriber.error(err);
                  },
                  complete: () => {
                    resolve();
                    subscriber.complete();
                  },
                });
            }),
          )
          .catch((err) => subscriber.error(err));
      });
    }

    const request = context.switchToHttp().getRequest();
    const userId: string | null = request.user?.id ?? null;

    // Wrap the entire request handler inside the RLS user context.
    // Observable.create is cold, so we need to start the async context before
    // subscribing, then hand control back to the Observable pipeline.
    return new Observable((subscriber) => {
      this.rlsContext
        .runWithUser(userId, () =>
          new Promise<void>((resolve, reject) => {
            next
              .handle()
              .subscribe({
                next: (value) => subscriber.next(value),
                error: (err) => {
                  reject(err);
                  subscriber.error(err);
                },
                complete: () => {
                  resolve();
                  subscriber.complete();
                },
              });
          }),
        )
        .catch((err) => subscriber.error(err));
    });
  }
}
