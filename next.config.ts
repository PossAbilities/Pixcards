import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Next's App Router injects inline bootstrap scripts
// and styles, so 'unsafe-inline' is needed without per-request nonces (which
// would force every page to render dynamically). Fonts are self-hosted.
// Images and client fetches allow any https host because uploads live on
// configurable S3 / Supabase storage (and the inline provider uses data: URIs).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' data: blob: https:${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // Server actions redirect to Stripe Checkout / Billing Portal.
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, Next infers the root
  // from the nearest lockfile — a stray package-lock.json in a parent folder
  // (e.g. a developer's home directory during a local `netlify deploy
  // --build`) makes it trace files from the wrong tree, corrupting the
  // serverless function bundle.
  turbopack: {
    root: import.meta.dirname,
  },
  // Security response headers (flagged by the Ryan's Cloud Hub agent).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
