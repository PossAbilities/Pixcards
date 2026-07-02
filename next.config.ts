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
};

export default nextConfig;
