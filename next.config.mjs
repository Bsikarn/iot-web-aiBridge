/** @type {import('next').NextConfig} */
const nextConfig = {
    // Specify server external packages for native Node modules
    serverExternalPackages: ['canvas', '@resvg/resvg-js'],
};

export default nextConfig;