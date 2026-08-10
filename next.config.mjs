/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable typechecking during production build
    typescript: {
        ignoreBuildErrors: true,
    },
    // Specify server external packages for native Node modules
    serverExternalPackages: ['canvas', 'pdf2json'],
};

export default nextConfig;