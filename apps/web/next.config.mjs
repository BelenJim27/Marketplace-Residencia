import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/routing.ts");

const _apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");

const nextConfig = {
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    remotePatterns: [
      {
        protocol: _apiUrl.protocol.replace(":", ""),
        hostname: _apiUrl.hostname,
        port: _apiUrl.port || "",
        pathname: "/**",
      },
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    // Cabeceras de seguridad para todas las respuestas del frontend.
    // La CSP se mantiene conservadora (frame-ancestors/base-uri/object-src) para
    // dar protección anti-clickjacking sin romper scripts/estilos inline de Next.
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
      },
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return {
      beforeFiles: [],
      afterFiles: [
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
      { source: '/paises/:path*', destination: `${apiUrl}/paises/:path*` },
      { source: '/idiomas/:path*', destination: `${apiUrl}/idiomas/:path*` },
      { source: '/tasas-cambio/:path*', destination: `${apiUrl}/tasas-cambio/:path*` },
      { source: '/comisiones/:path*', destination: `${apiUrl}/comisiones/:path*` },
      { source: '/payouts/:path*', destination: `${apiUrl}/payouts/:path*` },
      { source: '/estadisticas/:path*', destination: `${apiUrl}/estadisticas/:path*` },
      ],
      fallback: [],
    };
  },
};

const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
  autoInstrumentClientSide: false,
};

export default withSentryConfig(withNextIntl(nextConfig), sentryConfig);