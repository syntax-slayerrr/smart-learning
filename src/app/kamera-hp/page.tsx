import { Metadata } from "next";
import { Suspense } from "react";
import { KameraHpClient } from "./kamera-hp-client";

export const metadata: Metadata = {
  title: "Pemancar Kamera HP — Syntax Slayer Smart Learning",
  description: "Pancarkan video kamera HP langsung ke AI Vision Engine tanpa install aplikasi",
};

export default function KameraHpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center text-xs">Memuat Pemancar Kamera...</div>}>
      <KameraHpClient />
    </Suspense>
  );
}
