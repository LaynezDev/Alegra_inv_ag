/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "images.unsplash.com",
      "res.cloudinary.com",
      "firebasestorage.googleapis.com",
      "storage.googleapis.com",
    ],
  },
};

export default nextConfig;
