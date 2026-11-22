import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tags every build with Vercel's deployment id. A tab still running an older build
  // then reloads on its next navigation instead of failing on code that no longer exists.
  // Unset locally, where it changes nothing.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  async headers() {
    return [{
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        // A new deploy must reach phones at once, never a cached worker.
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
      ],
    }];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
