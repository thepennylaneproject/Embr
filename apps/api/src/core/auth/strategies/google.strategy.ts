// apps/api/src/modules/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'placeholder';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3003/api/auth/google/callback'; // pragma: allowlist secret
    
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      state: true, // Enable state parameter validation to prevent CSRF attacks
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    // Validate required profile fields
    if (!id || !emails?.[0]?.value) {
      return done(new Error('Google profile is missing required fields (id or email)'), undefined);
    }

    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name?.givenName || 'User',
      lastName: name?.familyName || '',
      picture: photos?.[0]?.value || null,
      accessToken,
    };

    done(null, user);
  }
}
