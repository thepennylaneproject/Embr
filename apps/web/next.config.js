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

/**
 * Next/Image remote patterns.
 * In production, set NEXT_PUBLIC_IMAGE_ALLOWED_HOSTS to a comma-separated list of
 * exact media hostnames (e.g. your S3 website endpoint or CDN) to drop broad S3/CloudFront wildcards.
 */
function buildImageRemotePatterns() {
  const pathname = '/**';
  const staticCdn = [
    { protocol: 'https', hostname: 'res.cloudinary.com', pathname },
    { protocol: 'https', hostname: 'gravatar.com', pathname },
    { protocol: 'https', hostname: 'api.dicebear.com', pathname },
    { protocol: 'https', hostname: 'placehold.co', pathname },
    { protocol: 'https', hostname: 'via.placeholder.com', pathname },
    { protocol: 'https', hostname: 'picsum.photos', pathname },
  ];
  const allowHosts = (process.env.NEXT_PUBLIC_IMAGE_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((hostname) => ({ protocol: 'https', hostname, pathname }));

  const strictProd =
    process.env.NODE_ENV === 'production' && allowHosts.length > 0;

  if (strictProd) {
    return [...staticCdn, ...allowHosts];
  }

  return [
    ...staticCdn,
    { protocol: 'https', hostname: '*.s3.amazonaws.com', pathname },
    { protocol: 'https', hostname: '*.s3.*.amazonaws.com', pathname },
    { protocol: 'https', hostname: '*.cloudfront.net', pathname },
    { protocol: 'https', hostname: '*.imgix.net', pathname },
    { protocol: 'https', hostname: '*.githubusercontent.com', pathname },
    ...allowHosts,
  ];
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [ // pragma: allowlist secret
    '@embr/ui', '@embr/types', '@embr/utils', '@embr/config',
    '@embr/auth', '@embr/monetization', '@embr/music-sdk', '@embr/creator-tools',
  ],

  images: {
    remotePatterns: buildImageRemotePatterns(),
  },

  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    // In development, allow cross-port localhost connections (API runs on different port).
    // In production, include API + WS origins from env so fetch/socket.io work; dedupe hosts.
    /** @type {Set<string>} */
    const connectParts = new Set();
    if (isDev) {
      connectParts.add("'self'");
      connectParts.add('https://api.stripe.com');
      connectParts.add('ws://localhost:*');
      connectParts.add('http://localhost:3003');
      connectParts.add('http://localhost:*'); // pragma: allowlist secret
    } else {
      connectParts.add("'self'");
      connectParts.add('https://api.stripe.com');
      for (const envName of ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WS_URL']) {
        const raw = process.env[envName];
        if (!raw || !raw.trim()) continue;
        try {
          const u = new URL(raw);
          connectParts.add(`${u.protocol}//${u.host}`);
        } catch {
          console.warn(`[Embr CSP] Skipping invalid ${envName} for connect-src`);
        }
      }
    }
    const connectSrc = [...connectParts].join(' ');

    // Production: drop 'unsafe-eval' (Next production bundles do not rely on eval).
    // script/style 'unsafe-inline' remains for Pages Router + hydration; tightening further
    // needs nonce-based CSP (typically App Router + middleware).
    const scriptSrc = isDev
      ? "'self' 'unsafe-inline' 'unsafe-eval'"
      : "'self' 'unsafe-inline'";
    const styleSrc = "'self' 'unsafe-inline'";

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              `style-src ${styleSrc}`,
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              `connect-src ${connectSrc}`,
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
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
