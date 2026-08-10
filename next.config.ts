import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    // AVIF first, WebP fallback — smallest payload the browser supports.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "i.pinimg.com" },
      // Google account avatars. Required — next/image throws at runtime for any
      // host not listed here, so the header avatar cannot render without it.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  experimental: {
    // Tree-shake barrel imports so we don't ship all of lucide-react.
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },

  // ioredis and bcryptjs must stay external to the server bundle.
  serverExternalPackages: ["ioredis", "bcryptjs", "@prisma/client"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Product imagery is content-addressed by filename; cache hard.
        source: "/products/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
