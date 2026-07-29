// frontend/app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BXR+',
    short_name: 'BXR+',
    description: 'Your aesthetic workspace. Completely synced.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f5f0',
    theme_color: '#c2956e',
    icons: [
      {
        src: '/bxr-icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/bxr-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/bxr-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
