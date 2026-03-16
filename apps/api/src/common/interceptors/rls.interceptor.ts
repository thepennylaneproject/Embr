import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RlsContextService } from '../../core/database/rls-context.service';

/**
 * Global HTTP interceptor that populates the RLS context from the JWT-authenticated
 * user before any service/database code runs.
 *
 * - Authenticated requests:  sets `app.current_user_id` to `request.user.id`
 * - Unauthenticated requests: sets no user ID (public-data policies apply)
 *
 * Register this as a global APP_INTERCEPTOR in AppModule.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly rlsContext: RlsContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      // WebSocket / RPC contexts: run without user context (service policies apply)
      return next.handle();
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
