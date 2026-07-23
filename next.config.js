/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `output: 'export'` — the dashboard uses middleware, cookies, and
  // route handlers, which static export can't run. Standard Next.js
  // config keeps deployment portable across any Node host.
}
module.exports = nextConfig
