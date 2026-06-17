import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/signup", destination: "/sign-up", permanent: true },
      { source: "/register", destination: "/sign-up", permanent: true },
      { source: "/login", destination: "/sign-in", permanent: true },
    ];
  },
};

export default nextConfig;
