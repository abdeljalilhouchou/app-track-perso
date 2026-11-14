import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tags every build with Vercel's deployment id. A tab still running an older build
  // then reloads on its next navigation instead of failing on code that no longer exists.
  // Unset locally, where it changes nothing.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
