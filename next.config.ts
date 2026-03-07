import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // pdf-parse uses pdfjs-dist which spawns Node.js worker threads at runtime.
  // Bundling it with webpack breaks worker file path resolution.
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default withNextIntl(nextConfig);
