import type { Metadata } from "next";
import { ScannerClient } from "./scanner-client";

export const metadata: Metadata = { title: "Scan QR Absensi" };

export default function ScanPage() {
  return (
    <div className="dashboard-container max-w-lg space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Scan QR Absensi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arahkan kamera ke QR code yang ditampilkan guru
        </p>
      </div>
      <ScannerClient />
    </div>
  );
}
