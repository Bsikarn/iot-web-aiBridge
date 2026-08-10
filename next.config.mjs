/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable typechecking during production build
    typescript: {
        ignoreBuildErrors: true,
    },
    // Specify server external packages for native WASM and Node modules
    serverExternalPackages: ['@resvg/resvg-js', 'mathjax-full', 'pdf2json'],
};

export default nextConfig;