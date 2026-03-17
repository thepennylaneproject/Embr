/** @type {import('next').NextConfig} */

// Validate environment variables before Next.js configuration is applied.
// This runs on `next dev`, `next build`, and `next start` so misconfigurations
// are surfaced immediately rather than causing cryptic runtime failures.
//
// next.config.js is plain JavaScript, so we inline a minimal validation here
// rather than importing the TypeScript module at apps/web/src/lib/env.ts
// (which is transpiled separately).
(function validateRequiredEnv() {
  /** @type {Array<{name: string, description: string, validate?: (v: string) => boolean, hint?: string}>} */
  const required = [
    {
      name: 'NEXT_PUBLIC_API_URL',
      description: 'Base URL for the Embr API (e.g. http://localhost:3003/api)', // pragma: allowlist secret
      validate: (v) => /^https?:\/\/.+/.test(v),
      hint: 'must be a full HTTP(S) URL',
    },
    {
      name: 'NEXT_PUBLIC_WS_URL',
      description: 'WebSocket server URL for real-time messaging (e.g. http://localhost:3003)', // pragma: allowlist secret
      validate: (v) => /^(https?|wss?):\/\/.+/.test(v),
      hint: 'must be a full HTTP(S) or WS(S) URL',
    },
  ];

  /** @type {string[]} */
  const errors = [];

  for (const spec of required) {
    const value = process.env[spec.name];
    if (!value || value.trim() === '') {
      errors.push(`  ${spec.name} — ${spec.description}`);
    } else if (spec.validate && !spec.validate(value)) {
      errors.push(`  ${spec.name} — invalid value ("${value}"): ${spec.hint}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      '[Embr] Missing or invalid required environment variables:\n' +
        errors.join('\n') +
        '\n\nCopy apps/web/.env.example to apps/web/.env.local and fill in the values.',
    );
  }

  // Log optional vars that are absent so operators notice them during startup.
  /** @type {Array<{name: string, description: string}>} */
  const optional = [
    { name: 'NEXT_PUBLIC_WEB_URL', description: 'Public web app URL (canonical links, OAuth)' },
    { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', description: 'Stripe key (payment UIs)' },
    { name: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID', description: 'Google OAuth (Sign in with Google)' },
    { name: 'NEXT_PUBLIC_GA_ID', description: 'Google Analytics' },
    { name: 'NEXT_PUBLIC_SENTRY_DSN', description: 'Sentry error tracking' },
  ];

  const missing = optional.filter(({ name }) => !process.env[name]);
  if (missing.length > 0) {
    console.warn(
      '[Embr] Optional environment variables are not set — some features will be unavailable:\n' +
        missing.map(({ name, description }) => `  ${name} — ${description}`).join('\n'),
    );
  }
})();

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [ // pragma: allowlist secret
    '@embr/ui', '@embr/types', '@embr/utils', '@embr/config',
    '@embr/auth', '@embr/monetization', '@embr/music-sdk', '@embr/creator-tools',
  ],

  images: {
    remotePatterns: [
      // AWS S3 buckets (any region/bucket name)
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      // AWS CloudFront CDN
      { protocol: 'https', hostname: '*.cloudfront.net' },
      // Common image CDNs / hosting services used for user avatars
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.imgix.net' },
      { protocol: 'https', hostname: 'gravatar.com' },
      { protocol: 'https', hostname: '*.githubusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.stripe.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
