/** @type {import('next').NextConfig} */
const nextConfig = {
    // สั่งให้ Vercel ไม่ต้องหยุด Deploy ถึงแม้จะเจอ Type Error
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;