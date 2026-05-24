import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/mt',
  transpilePackages: ["@base-ui/react", "lucide-react", "pinyin-pro"],
};

export default nextConfig;
