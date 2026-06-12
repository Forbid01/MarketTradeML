/** @type {import('next').NextConfig} */
const nextConfig = {
  // Энэ project-ийн фолдерыг Turbopack-ийн root болгож, эцэг хавтсын
  // package-lock.json-г андуурахаас сэргийлнэ.
  turbopack: {
    root: import.meta.dirname,
  },
  // Зарын зураг upload (server action FormData) — default 1MB-аас дээш зөвшөөрнө.
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  // Vercel Blob дээрх зарын зургуудыг next/image optimizer-ээр (resize + WebP/AVIF) дамжуулна.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
