import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        /* the Drive folder index is big and changes rarely; it is only fetched when the Library opens */
        source: "/library-index.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
      {
        /* logo, icons and other public images change rarely: let browsers keep them for a day */
        source: "/:file((?!api/).*\\.(?:png|jpg|jpeg|svg|ico|webp|gif))",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
