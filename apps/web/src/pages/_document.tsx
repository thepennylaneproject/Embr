import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        {/* Viewport is set by Next.js; do not add it in _document — use next/head in _app or per-page if you need a custom viewport */}

        {/* SEO meta tags */}
        <meta name="description" content="Embr - Connect with creators, share gigs, and grow your network" />
        <meta name="keywords" content="creator economy, gig marketplace, social network, freelance" />
        <meta name="theme-color" content="#FF6B35" />

        {/* Open Graph for social sharing */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Embr - Creator Community & Gig Marketplace" />
        <meta property="og:description" content="Connect with creators, share gigs, and grow your network" />
        <meta property="og:site_name" content="Embr" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Embr - Creator Community & Gig Marketplace" />
        <meta name="twitter:description" content="Connect with creators, share gigs, and grow your network" />

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" />

        {/* Security headers as meta tags (complementary to Helmet) */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Preconnect to external services */}
        <link rel="preconnect" href="https://api.sendgrid.com" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
