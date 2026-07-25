import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Let other devices on the LAN load dev-only resources (HMR, /_next/*).
  // The exact host IP is required; the subnet wildcards cover other devices.
  allowedDevOrigins: ["192.168.1.97", "192.168.1.*", "192.168.0.*"],
  // Pin the workspace root so Turbopack doesn't infer it from a parent lockfile.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
