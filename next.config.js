/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
      {
        source: '/docs',
        destination: `${API_URL}/docs`,
      },
      {
        source: '/openapi.json',
        destination: `${API_URL}/openapi.json`,
      },
    ];
  },
};

module.exports = nextConfig;
