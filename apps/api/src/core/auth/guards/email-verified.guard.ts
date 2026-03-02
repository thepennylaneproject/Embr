import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';
export const SkipEmailVerification = () => SetMetadata(SKIP_EMAIL_VERIFICATION_KEY, true);

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route explicitly skips email verification
    const skipEmailVerification = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipEmailVerification) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Allow public routes and unauthenticated users
    if (!user) {
      return true;
    }

    // Enforce email verification for authenticated users
    if (!user.isVerified) {
      throw new ForbiddenException('Email verification is required to access this resource');
    }

    return true;
  }
}
