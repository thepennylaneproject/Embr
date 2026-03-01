# Quick Implementation Guide

## Step-by-Step Integration

### 1. Database Setup (5 minutes)

```bash
# Connect to your PostgreSQL database
psql -U your_user -d embr_db

# Run the migration
\i migrations/001_create_auth_tables.sql

# Verify tables were created
\dt
```

### 2. Backend Integration (10 minutes)

**Copy files to your NestJS project:**

```
backend/auth.* → apps/api/src/modules/auth/
backend/users/ → apps/api/src/modules/users/
backend/strategies/ → apps/api/src/modules/auth/strategies/
backend/guards/ → apps/api/src/modules/auth/guards/
backend/decorators/ → apps/api/src/modules/auth/decorators/
backend/dto/ → apps/api/src/modules/auth/dto/
backend/entities/ → apps/api/src/modules/auth/entities/
```

**Update app.module.ts:**

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: false, // Use migrations instead
    }),
    AuthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

**Install dependencies:**

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-google-oauth20 bcryptjs
npm install -D @types/passport-jwt @types/bcryptjs
```

### 3. Frontend Integration (10 minutes)

**Copy files to your Next.js project:**

```
frontend/contexts/ → apps/web/src/contexts/
frontend/pages/ → apps/web/src/app/
frontend/components/ → apps/web/src/components/
frontend/lib/ → apps/web/src/lib/
frontend/types/ → apps/web/src/types/
```

**Install dependencies:**

```bash
npm install axios
```

**Wrap your app with AuthProvider (app/layout.tsx):**

```typescript
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 4. Environment Configuration (5 minutes)

**Backend (.env):**

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=embr_db

# JWT
JWT_SECRET=generate-a-random-secret-key-here-use-openssl-rand-base64-32
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=generate-another-random-secret-key
JWT_REFRESH_EXPIRATION=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3003/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3004
```

**Frontend (.env.local):**

```env
NEXT_PUBLIC_API_URL=http://localhost:3003/api
```

### 5. Google OAuth Setup (10 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. **Enable APIs:**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. **Create OAuth Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3003/api/auth/google/callback`
5. Copy Client ID and Client Secret to your .env

### 6. Test the Setup (5 minutes)

**Start your servers:**

```bash
# Backend
cd apps/api
npm run start:dev

# Frontend (new terminal)
cd apps/web
npm run dev
```

**Test the auth flow:**

1. Navigate to http://localhost:3004/auth/signup
2. Create an account
3. You should be redirected to /feed
4. Navigate to /profile/edit
5. Update your profile

**Test protected routes:**

1. Clear localStorage in browser
2. Try to access /profile/edit
3. You should be redirected to /login

## Common Issues & Solutions

### Issue: "Module not found" errors

**Solution:** Check your import paths match your project structure. Update if needed:

```typescript
// Adjust these paths based on your actual structure
import { AuthService } from "../auth/auth.service";
import { User } from "../users/entities/user.entity";
```

### Issue: Database connection fails

**Solution:** Verify PostgreSQL is running and credentials are correct:

```bash
psql -U your_user -d embr_db -c "SELECT 1;"
```

### Issue: Google OAuth redirect fails

**Solution:**

- Verify redirect URI in Google Console matches exactly
- Check FRONTEND_URL in backend .env
- Ensure no trailing slashes in URLs

### Issue: JWT token not refreshing

**Solution:**

- Check JWT_REFRESH_SECRET is set
- Verify refresh token is being sent in request body
- Check browser console for errors

## Email Service Setup (Optional)

The auth module includes email verification and password reset, but you need to configure an email service.

**Using Gmail (development only):**

```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@embr.app
```

**Production options:**

- SendGrid
- Amazon SES
- Mailgun
- Postmark

## Next Features to Build

1. **Settings page** - Let users manage notification preferences
2. **Sessions management** - Show active devices/sessions
3. **Avatar upload** - Integrate with S3
4. **Social links** - Add Instagram, Twitter, etc.
5. **Email templates** - Design beautiful verification/reset emails

## Need Help?

Check the main README.md for:

- Complete API documentation
- Security best practices
- Troubleshooting guide
- Additional resources

---

You're all set! 🚀 Start building Embr's creator features on this solid auth foundation.
