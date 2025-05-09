import type { NextConfig } from "next";
console.log('TAILWINDCSS_DISABLE_OXIDE:', process.env.TAILWINDCSS_DISABLE_OXIDE);

const nextConfig: NextConfig = {
  env: {
    TAILWINDCSS_DISABLE_OXIDE: "1",
    NEXT_TELEMETRY_DISABLED: "1"
  },
  // Disable the new Rust-based compiler for CSS
  experimental: {
    // Disable features that might rely on platform-specific binaries
    serverComponentsExternalPackages: [],
  },
  // Ensure we're using the JS implementation instead of Rust
  webpack: (config) => {
    // Force using the JavaScript implementation of lightningcss
    if (config.resolve && config.resolve.alias) {
      config.resolve.alias['lightningcss-wasm'] = 'lightningcss-wasm';
    }
    return config;
  }
};

export default nextConfig;
