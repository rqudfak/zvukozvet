import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // ВКЛЮЧАЕМ СТАТИЧЕСКИЙ ЭКСПОРТ
  images: {
    unoptimized: true,
  },
  distDir: 'out',    // папка для экспорта
};

export default nextConfig;