import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Explícito (ya es el valor por defecto en producción): sin mapas de
  // fuente en el bundle público, nadie puede reconstruir el código fuente
  // original desde las devtools del navegador.
  productionBrowserSourceMaps: false,
  experimental: {
    // Sólo se importa lo que se usa de estos paquetes (bundle más pequeño).
    optimizePackageImports: ['lucide-react', 'framer-motion', '@tanstack/react-query'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
