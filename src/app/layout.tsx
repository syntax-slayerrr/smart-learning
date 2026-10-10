import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  interactiveWidget: "resizes-content",
};
import { Suspense } from "react";
import { PushManager } from "@/components/shared/push-manager";
import { NetworkStatusIndicator } from "@/components/shared/network-status-indicator";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { SCHOOL_NAME } from "@/lib/constants";
import "./globals.css";

// System Apple HIG font stack via CSS variable
const interVariable = "font-sans";

export const metadata: Metadata = {
  title: {
    default: `Smart Learning — ${SCHOOL_NAME}`,
    template: "%s | Smart Learning",
  },
  description:
    `Sistem Manajemen Pembelajaran & Presensi Cerdas Berbasis AI Vision ${SCHOOL_NAME}.`,
  keywords: ["smart learning", "lms", "presensi ai", "telemetri kelas", "smk ti", "kejuruan"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smart Learning",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full min-h-full font-sans relative antialiased selection:bg-orange-600/20 selection:text-orange-700">
        <AmbientBackground intensity="medium" />
        <NetworkStatusIndicator />
        <Suspense fallback={null}>
          <PushManager />
        </Suspense>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
