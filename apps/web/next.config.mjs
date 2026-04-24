import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/routing.ts");

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      { source: '/auth/:path*', destination: `${apiUrl}/auth/:path*` },
      { source: '/usuarios/:path*', destination: `${apiUrl}/usuarios/:path*` },
      { source: '/productos/:path*', destination: `${apiUrl}/productos/:path*` },
      { source: '/categorias/:path*', destination: `${apiUrl}/categorias/:path*` },
      { source: '/productores/:path*', destination: `${apiUrl}/productores/:path*` },
      { source: '/tiendas/:path*', destination: `${apiUrl}/tiendas/:path*` },
      { source: '/pedidos/:path*', destination: `${apiUrl}/pedidos/:path*` },
      { source: '/inventario/:path*', destination: `${apiUrl}/inventario/:path*` },
      { source: '/carrito/:path*', destination: `${apiUrl}/carrito/:path*` },
      { source: '/wishlist/:path*', destination: `${apiUrl}/wishlist/:path*` },
      { source: '/pagos/:path*', destination: `${apiUrl}/pagos/:path*` },
      { source: '/envios/:path*', destination: `${apiUrl}/envios/:path*` },
      { source: '/transportistas/:path*', destination: `${apiUrl}/transportistas/:path*` },
      { source: '/resenas/:path*', destination: `${apiUrl}/resenas/:path*` },
      { source: '/direcciones/:path*', destination: `${apiUrl}/direcciones/:path*` },
      { source: '/notificaciones/:path*', destination: `${apiUrl}/notificaciones/:path*` },
      { source: '/archivos/:path*', destination: `${apiUrl}/archivos/:path*` },
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
      { source: '/lotes/:path*', destination: `${apiUrl}/lotes/:path*` },
      { source: '/roles/:path*', destination: `${apiUrl}/roles/:path*` },
      { source: '/admin/:path*', destination: `${apiUrl}/admin/:path*` },
      { source: '/configuracion/:path*', destination: `${apiUrl}/configuracion/:path*` },
      { source: '/auditoria/:path*', destination: `${apiUrl}/auditoria/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);