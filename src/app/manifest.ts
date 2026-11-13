import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InstiFound, lost and found for IIT Madras",
    short_name: "InstiFound",
    description: "See every found item on campus and exactly where to collect it.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f2",
    theme_color: "#16402f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
