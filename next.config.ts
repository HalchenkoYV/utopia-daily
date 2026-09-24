import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Story JSON files are read from disk at runtime by server routes,
  // so make sure Vercel bundles them with every function.
  outputFileTracingIncludes: {
    "/*": ["./content/**/*"],
  },
};

export default nextConfig;
