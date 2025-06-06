/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend =
      process.env.BACKEND_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://127.0.0.1:8000"
        : "http://backend:8000");

    return [
      {
        source: "/api/:path*",
        destination: `${backend}/:path*`,
      },
      {
        source: "/docs",
        destination: `${backend}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${backend}/openapi.json`,
      },
    ];
  },
};

module.exports = nextConfig;
