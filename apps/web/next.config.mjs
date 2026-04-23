import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/routing.ts");

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig = {
  turbopack: {
    resolveAlias: {
      pako: "pako/dist/pako.js",
    },
  },
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
      { source: "/uploads/:path*",         destination: `${API_URL}/uploads/:path*` },
      { source: "/auth/:path*",            destination: `${API_URL}/auth/:path*` },
      { source: "/productos/:path*",       destination: `${API_URL}/productos/:path*` },
      { source: "/categorias/:path*",      destination: `${API_URL}/categorias/:path*` },
      { source: "/productores/:path*",     destination: `${API_URL}/productores/:path*` },
      { source: "/tiendas/:path*",         destination: `${API_URL}/tiendas/:path*` },
      { source: "/inventario/:path*",      destination: `${API_URL}/inventario/:path*` },
      { source: "/lotes/:path*",           destination: `${API_URL}/lotes/:path*` },
      { source: "/pedidos/:path*",         destination: `${API_URL}/pedidos/:path*` },
      { source: "/carrito/:path*",         destination: `${API_URL}/carrito/:path*` },
      { source: "/wishlist/:path*",        destination: `${API_URL}/wishlist/:path*` },
      { source: "/pagos/:path*",           destination: `${API_URL}/pagos/:path*` },
      { source: "/envios/:path*",          destination: `${API_URL}/envios/:path*` },
      { source: "/transportistas/:path*",  destination: `${API_URL}/transportistas/:path*` },
      { source: "/resenas/:path*",         destination: `${API_URL}/resenas/:path*` },
      { source: "/direcciones/:path*",     destination: `${API_URL}/direcciones/:path*` },
      { source: "/notificaciones/:path*",  destination: `${API_URL}/notificaciones/:path*` },
      { source: "/archivos/:path*",        destination: `${API_URL}/archivos/:path*` },
      { source: "/configuracion/:path*",   destination: `${API_URL}/configuracion/:path*` },
      { source: "/auditoria/:path*",       destination: `${API_URL}/auditoria/:path*` },
      { source: "/roles/:path*",           destination: `${API_URL}/roles/:path*` },
      { source: "/usuarios/:path*",        destination: `${API_URL}/usuarios/:path*` },
      { source: "/admin/:path*",           destination: `${API_URL}/admin/:path*` },
      { source: "/api/inventario/:path*",  destination: `${API_URL}/inventario/:path*` },
      { source: "/api/productos/:path*",   destination: `${API_URL}/productos/:path*` },
      { source: "/api/categorias/:path*",  destination: `${API_URL}/categorias/:path*` },
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
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
