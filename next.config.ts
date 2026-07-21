import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
