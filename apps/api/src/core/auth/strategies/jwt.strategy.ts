// apps/api/src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../auth.service';

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.accessToken ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKeyProvider: (_req: any, _rawJwt: any, done: any) => {
        const secret = configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        if (!secret) {
          return done(new Error('JWT_SECRET is not configured'), undefined);
        }
        done(null, secret);
      },
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    // #region agent log
    fetch('http://127.0.0.1:7760/ingest/52e30910-2c9b-4282-99bc-06b24f01d527',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a106a6'},body:JSON.stringify({sessionId:'a106a6',location:'jwt.strategy.ts:validate',message:'JWT validated from cookie/header',data:{sub:payload.sub,email:payload.email},timestamp:Date.now(),hypothesisId:'H-jwt-cookie'})}).catch(()=>{});
    // #endregion
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
