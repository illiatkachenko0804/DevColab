import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root so Turbopack doesn't infer it from a parent lockfile.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
