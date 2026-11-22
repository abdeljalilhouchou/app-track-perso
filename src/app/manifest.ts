import type { MetadataRoute } from "next";

/** Lets the app be added to the home screen and open full screen, like an installed app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "track.perso",
    short_name: "track.perso",
    description: "Habitudes, sport, repas et humeur au même endroit.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b10",
    theme_color: "#0b0b10",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
