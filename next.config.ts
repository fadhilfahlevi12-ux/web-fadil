import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload arsip digital (PDF) lewat Server Action; default Next.js hanya 1MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
