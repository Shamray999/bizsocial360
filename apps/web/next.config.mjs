/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The internal shared package ships TypeScript source, so Next must transpile it.
  transpilePackages: ['@bizsocial360/shared'],
};

export default nextConfig;
