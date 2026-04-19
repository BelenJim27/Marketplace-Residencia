import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/routing.ts");

/** @type {import("next").NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://localhost:3001/uploads/:path*",
      },
      {
        source: "/inventario/:path*",
        destination: "http://localhost:3001/inventario/:path*",
      },
      {
        source: "/api/inventario/:path*",
        destination: "http://localhost:3001/inventario/:path*",
      },
      {
        source: "/productos/:path*",
        destination: "http://localhost:3001/productos/:path*",
      },
      {
        source: "/api/productos/:path*",
        destination: "http://localhost:3001/productos/:path*",
      },
      {
        source: "/productores/:path*",
        destination: "http://localhost:3001/productores/:path*",
      },
      {
        source: "/pedidos/:path*",
        destination: "http://localhost:3001/pedidos/:path*",
      },
      {
        source: "/categorias/:path*",
        destination: "http://localhost:3001/categorias/:path*",
      },
      {
        source: "/api/categorias/:path*",
        destination: "http://localhost:3001/categorias/:path*",
      },
    ];
  },
  images: {
    qualities: [100, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io"
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com"
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev"
      }
    ]
  }
};

export default nextConfig;
