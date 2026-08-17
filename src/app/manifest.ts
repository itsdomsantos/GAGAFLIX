import type { MetadataRoute } from "next";

/**
 * PWA manifest — lets visitors add GAGAFLIX to their home screen as a
 * standalone, full-screen shortcut (just the icon + the name "GAGAFLIX").
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GAGAFLIX",
    short_name: "GAGAFLIX",
    description:
      "The whole Lady Gaga universe in one place: live performances, music videos, interviews and more.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0d",
    theme_color: "#0a0a0d",
    categories: ["entertainment", "music"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
