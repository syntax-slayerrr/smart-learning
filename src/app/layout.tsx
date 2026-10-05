import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#007AFF",
  interactiveWidget: "overlays-content",
};
import { Suspense } from "react";
import { PushManager } from "@/components/shared/push-manager";
import { AmbientBackground } from "@/components/layout/ambient-background";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Smart Learning — AI-Powered Learning Ecosystem",
    template: "%s | Smart Learning",
  },
  description:
    "Next-Generation AI-Powered Smart Learning & Campus Ecosystem with interactive courses, adaptive quizzes, and vocational tracking.",
  keywords: ["smart learning", "lms", "adaptive learning", "ai tutor", "education", "vocational"],
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
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen font-sans relative antialiased selection:bg-blue-600/20 selection:text-blue-700">
        <AmbientBackground intensity="medium" />
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
