import type { NextConfig } from "next";

if (!process.env.TAILWINDCSS_DISABLE_OXIDE) {
  process.env.TAILWINDCSS_DISABLE_OXIDE = "1";
}
console.log('TAILWINDCSS_DISABLE_OXIDE:', process.env.TAILWINDCSS_DISABLE_OXIDE);

try {
  const lightningBinary = require.resolve('@tailwindcss/node/node_modules/lightningcss/node/index.js');
  console.log("LightningCSS module resolved at", lightningBinary);
} catch (error) {
  console.warn("LightningCSS module could not be resolved:", error);
}

const nextConfig: NextConfig = {
  env: {
    TAILWINDCSS_DISABLE_OXIDE: "1",
    NEXT_TELEMETRY_DISABLED: "1"
  },
  webpack: (config) => {
    console.log("Starting custom webpack configuration.");
    if (config.resolve && config.resolve.alias) {
      config.resolve.alias['lightningcss-wasm'] = 'lightningcss-wasm';
      console.log("Set alias for lightningcss-wasm.");
    }
    return config;
  }
};

export default nextConfig;

console.log("NextConfig env:", nextConfig.env);
