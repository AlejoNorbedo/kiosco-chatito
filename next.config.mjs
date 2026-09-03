import withPWA from 'next-pwa'

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

// Se limita al host exacto del proyecto en lugar de aceptar cualquier
// *.supabase.co: el optimizador de imágenes solo debería servir desde nuestro
// Storage. Si la variable no está (algún build suelto), se cae al comodín para
// no romper las imágenes.
const hostSupabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  } catch {
    return '*.supabase.co'
  }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: hostSupabase,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withPWAConfig(nextConfig)
