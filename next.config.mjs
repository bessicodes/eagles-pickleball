/** @type {import('next').NextConfig} */

// When building for GitHub Pages we produce a fully static export served from
// a project subpath (e.g. /eagles-pickleball). Locally (`npm run dev`) none of
// this applies and the app runs at the root.
const isPages = process.env.GITHUB_PAGES === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  // The client-side engine is intentionally self-contained; lint shouldn't block a build.
  eslint: { ignoreDuringBuilds: true },

  ...(isPages
    ? {
        output: 'export',
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [
            {
              source: '/sw.js',
              headers: [
                { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                { key: 'Service-Worker-Allowed', value: '/' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
