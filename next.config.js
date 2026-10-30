/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'api.telegram.org'],
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard/admin',
        permanent: true,
      },
      {
        source: '/admin/approvals',
        destination: '/dashboard/admin/approvals',
        permanent: true,
      },
      {
        source: '/admin/payments',
        destination: '/dashboard/admin/payments',
        permanent: true,
      },
      {
        source: '/admin/users',
        destination: '/dashboard/admin/users',
        permanent: true,
      },
      {
        source: '/admin/ai-providers',
        destination: '/dashboard/admin/ai-providers',
        permanent: true,
      },
      {
        source: '/admin/ai-logs',
        destination: '/dashboard/admin/ai-logs',
        permanent: true,
      },
      {
        source: '/admin/transactions',
        destination: '/dashboard/admin/transactions',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

module.exports = nextConfig;
