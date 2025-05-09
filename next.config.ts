import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    TAILWINDCSS_DISABLE_OXIDE: "1"
  }
};

export default nextConfig;
