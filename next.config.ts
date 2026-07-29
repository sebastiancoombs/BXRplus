import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.VITE_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // This tells Turbopack to "transpile" these packages properly
  transpilePackages: [
    '@tiptap/react', 
    '@tiptap/starter-kit', 
    '@tiptap/extension-bubble-menu',
    'react-activity-calendar' // <-- ADD THIS LINE
  ],
};

export default nextConfig;
