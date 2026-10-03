import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SYNTAX SLAYER — Smart Learning",
    short_name: "SYNTAX SLAYER",
    description: "AI Classroom Intelligence & Smart Learning Ecosystem",
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
