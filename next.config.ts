import type { NextConfig } from "next";

// Content-Security-Policy. Fonts and the icon font are self-hosted, so scripts,
// styles and fonts are locked to our own origin. Next.js emits inline
// bootstrap scripts and React/email templates use inline styles, hence
// 'unsafe-inline' (no nonces, so pages stay statically renderable). Images and
// client-side fetches allow any https origin because avatars/uploads are
// served from the configurable S3/Supabase public base, plus data:/blob: for
// crops, QR codes and downloads. Dev needs 'unsafe-eval' for HMR/React refresh.
const isDev = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https: data: blob:${isDev ? " ws: wss:" : ""}`,
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
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
