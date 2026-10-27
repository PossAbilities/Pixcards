import type { NextConfig } from "next";

// Content-Security-Policy. Notes on the less-strict bits:
//  - script-src 'unsafe-inline': Next injects inline bootstrap/hydration
//    scripts and we don't use per-request nonces. Dev also needs 'unsafe-eval'
//    for React Refresh.
//  - style-src 'unsafe-inline': React style={} attributes and the print page's
//    inline <style>.
//  - img-src / connect-src https:: uploaded images live on S3/MinIO or Supabase
//    Storage, whose origin is only known from runtime env (not at build time).
//    The card renders them and fetches the avatar for the vCard photo.
//  - form-action Stripe: server actions redirect to Checkout / Billing Portal.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' data: blob: https:${isDev ? " ws:" : ""}`,
  "media-src 'self' data: blob:",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
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
