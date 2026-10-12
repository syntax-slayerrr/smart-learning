import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static, _next/image
     * - favicon.ico, manifest.json, manifest.webmanifest, sw.js
     * - images, wasm, tflite & public static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|wasm|tflite|bin|data|webmanifest)$).*)",
  ],
};
