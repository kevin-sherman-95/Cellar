/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.vivino.com' },
      { protocol: 'https', hostname: 'web-common.vivino.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
}

module.exports = nextConfig
