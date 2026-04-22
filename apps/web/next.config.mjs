import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/routing.ts");

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: false,
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.devtool = false;
    }
    return config;
  },
  async rewrites() {
    return [
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
      {
        source: "/inventario/:path*",
        destination: `${API_URL}/inventario/:path*`,
      },
      {
        source: "/productos/:path*",
        destination: `${API_URL}/productos/:path*`,
      },
      {
        source: "/productores/:path*",
        destination: `${API_URL}/productores/:path*`,
      },
      { source: "/pedidos/:path*", destination: `${API_URL}/pedidos/:path*` },
      {
        source: "/categorias/:path*",
        destination: `${API_URL}/categorias/:path*`,
      },
      {
        source: "/api/inventario/:path*",
        destination: `${API_URL}/inventario/:path*`,
      },
      {
        source: "/api/productos/:path*",
        destination: `${API_URL}/productos/:path*`,
      },
      {
        source: "/api/categorias/:path*",
        destination: `${API_URL}/categorias/:path*`,
      },
    ];
  },
  images: {
    qualities: [100, 75],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
