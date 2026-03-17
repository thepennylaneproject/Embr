/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const apiOrigin = apiUrl ? new URL(apiUrl.replace('/api', '')).origin : '';

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
      // DiceBear avatars (used by seed data)
      { protocol: 'https', hostname: 'api.dicebear.com' },
      // Placeholder images used in demo/seed content
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
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
              `connect-src 'self' https://api.stripe.com${apiOrigin ? ` ${apiOrigin}` : ''}`,
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
