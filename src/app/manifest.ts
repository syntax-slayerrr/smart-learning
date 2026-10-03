import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Absensi SMK Muhammadiyah TarKid",
    short_name: "Absen TarKid",
    description: "Sistem Absensi Modern SMK Muhammadiyah TarKid",
    start_url: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/logo_square_192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo_square_512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
