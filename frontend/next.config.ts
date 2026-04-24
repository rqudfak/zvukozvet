import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  distDir: 'out',    // папка для экспорта
};

export default nextConfig;