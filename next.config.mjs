/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 1. Hide tech stack signature from potential attackers
  poweredByHeader: false,
  
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },

  // 2. Comprehensive Enterprise Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Anti-Clickjacking: Prevent iframe embedding attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME-type sniffing attacks
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Legacy Cross-Site Scripting (XSS) filter
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer Policy: Never leak sensitive query params or paths
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Sandbox hardware permissions against unauthorized access
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          // HSTS: Enforce HTTPS encryption
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Cross-Origin Isolations
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // Private Bot Blocker: Strict instruction to Google, Bing, and AI crawlers
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
