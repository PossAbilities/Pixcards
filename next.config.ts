import type { NextConfig } from "next";

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
          // Disable browser features we don't use. clipboard-write and
          // web-share are left at their defaults (used by share/copy buttons).
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), display-capture=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
