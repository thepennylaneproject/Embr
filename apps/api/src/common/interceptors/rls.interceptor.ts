import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RlsContextService } from '../../core/database/rls-context.service';

/**
 * Global interceptor that populates the RLS context from the JWT-authenticated
 * user before any service/database code runs, for both HTTP and WebSocket contexts.
 *
 * - HTTP authenticated requests:       sets userId from `request.user.id`
 * - WebSocket authenticated requests:  sets userId from `socket.userId`
 *   (populated by the gateway's handleConnection JWT verification)
 * - Unauthenticated requests:          sets no user ID (public-data policies apply)
 * - RPC / other contexts:              passes through without setting RLS context
 *
 * Register this as a global APP_INTERCEPTOR in AppModule.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly rlsContext: RlsContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    let userId: string | null = null;

    const type = context.getType<string>();

    if (type === 'http') {
      const request = context.switchToHttp().getRequest();
      userId = request.user?.id ?? null;
    } else if (type === 'ws') {
      // socket.userId is set by the gateway's handleConnection() after JWT verification.
      // Both MessagingGateway and NotificationsGateway attach this field to their
      // AuthenticatedSocket when the JWT is validated on first connection.
      const client = context.switchToWs().getClient<{ userId?: string }>();
      userId = client.userId ?? null;
    } else {
      // RPC / microservice contexts: run without user context (service policies apply)
      return next.handle();
    }

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
