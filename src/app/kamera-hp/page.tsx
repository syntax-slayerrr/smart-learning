import { Metadata } from "next";
import { KameraHpClient } from "./kamera-hp-client";

export const metadata: Metadata = {
  title: "Pemancar Kamera HP — Syntax Slayer Smart Learning",
  description: "Pancarkan video kamera HP langsung ke AI Vision Engine tanpa install aplikasi",
};

export default function KameraHpPage() {
  return <KameraHpClient />;
}
