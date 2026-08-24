/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // /portfolio was live and shared before the portal got its own section
  // (owner, 2026-08-24). A 308 keeps that link working rather than 404ing
  // someone who already has it; drop this once nobody is holding the old URL.
  async redirects() {
    return [
      { source: "/portfolio", destination: "/portal/portfolio", permanent: true },
    ];
  },
};

export default nextConfig;
