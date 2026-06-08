import type { NextConfig } from "next";

const lanIp = process.env.LAN_DEV_ORIGIN;

const nextConfig: NextConfig = {
  // Required when opening the dev server via LAN IP (e.g. http://172.16.16.100:3000).
  // Without this, Next.js blocks /_next/* assets and React never hydrates — login form
  // falls back to a plain GET submit (? in the URL) with no API call.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "172.16.16.100",
    "172.16.*",
    "192.168.*",
    "10.*",
    ...(lanIp ? [lanIp] : []),
  ],
};

export default nextConfig;
