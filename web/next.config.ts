import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable styled-components support for SSR
  compiler: {
    styledComponents: true,
  },
  // Ignore peer dependency warnings for CSPR.click packages
  transpilePackages: [
    '@make-software/csprclick-ui',
    '@make-software/csprclick-core-client',
    '@make-software/csprclick-core-types',
  ],
};

export default nextConfig;
