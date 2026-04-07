// apps/api/src/modules/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // When auth is fully disabled the startup guard (assertAuthConfigSafe in
    // main.ts) will have already rejected production deployments.  In a local
    // dev stack we still require the bypass header so the dev server cannot be
    // accidentally exposed to the internet without immediate auth failures on
    // every request that lacks the secret.
    const authEnabled = process.env.AUTH_ENABLED !== 'false';
    if (!authEnabled) {
      const allowBypass = process.env.AUTH_ALLOW_LOCAL_BYPASS === 'true';
      const expectedSecret = process.env.AUTH_BYPASS_SECRET ?? '';

      if (allowBypass && expectedSecret.length >= 32) {
        const req = context.switchToHttp().getRequest<Request>();
        const suppliedSecret = req.headers['x-dev-bypass-secret'];
        if (suppliedSecret !== expectedSecret) {
          throw new UnauthorizedException(
            'AUTH_ENABLED=false but the required X-Dev-Bypass-Secret header is missing or incorrect.',
          );
        }
        // Bypass header validated — allow the request without JWT verification.
        // Note: req.user will be undefined; controllers that need a user must
        // not rely on it when auth is disabled.
        return true;
      }

      // AUTH_ENABLED=false without a properly configured bypass: reject all
      // requests rather than silently granting access to every caller.
      throw new UnauthorizedException(
        'Authentication is disabled but AUTH_ALLOW_LOCAL_BYPASS is not properly configured. ' +
          'Set AUTH_ALLOW_LOCAL_BYPASS=true and AUTH_BYPASS_SECRET (≥32 chars) to use local bypass mode.',
      );
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user || user === null || user === undefined) {
      throw err || new UnauthorizedException('Invalid or missing token');
    }
    return user;
  }
}
