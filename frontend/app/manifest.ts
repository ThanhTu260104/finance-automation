import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: 'SAW Requests',
    description: siteConfig.description,
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    lang: 'vi',
    icons: [
      { src: '/app-icon-web-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icon-web-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icon-web-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
