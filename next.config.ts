import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "better-sqlite3"],
  outputFileTracingIncludes: {
    "/api/interviews": ["./node_modules/pdfjs-dist/legacy/build/**"],
  },
};

export default nextConfig;
