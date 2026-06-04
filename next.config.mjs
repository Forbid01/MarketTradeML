/** @type {import('next').NextConfig} */
const nextConfig = {
  // Энэ project-ийн фолдерыг Turbopack-ийн root болгож, эцэг хавтсын
  // package-lock.json-г андуурахаас сэргийлнэ.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
