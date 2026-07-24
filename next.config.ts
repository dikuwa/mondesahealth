import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  async redirects() {
    return [
      {
        source: "/dashboard/platform/:path*",
        destination: "/platform/:path*",
        permanent: false,
      },
      {
        source: "/services/:slug",
        destination: "/services",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
