/** @type {import('next').NextConfig} */
const nextConfig = {
    // Specify server external packages for native Node modules & KaTeX
    serverExternalPackages: ['canvas', 'katex'],
};

export default nextConfig;