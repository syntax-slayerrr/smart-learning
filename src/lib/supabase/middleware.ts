import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            const extendedOptions = {
              ...(options as Record<string, unknown>),
              maxAge: 31536000, // 1 year persistence
            };
            supabaseResponse.cookies.set(name, value, extendedOptions);
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Define public routes and static assets
  const publicRoutes = ["/login", "/panduan", "/debug-auth", "/kamera-hp", "/api/setup-admin", "/api/health", "/sw.js", "/manifest.json", "/favicon.ico", "/icon.png", "/apple-icon.png"];
  const isPublicRoute = 
    publicRoutes.some((route) => pathname === route) || 
    pathname.startsWith("/panduan") ||
    pathname.startsWith("/api/cron") || 
    pathname.startsWith("/api/telemetry") || 
    pathname.startsWith("/api/attendance") || 
    pathname.startsWith("/api/classes") || 
    pathname.startsWith("/api/student") || 
    pathname.startsWith("/api/ai") || 
    pathname.startsWith("/api/lms") || 
    pathname.startsWith("/api/camera") || 
    pathname.startsWith("/brand") || 
    pathname.startsWith("/wasm") || 
    pathname.startsWith("/models") || 
    pathname.startsWith("/_next");

  if (isPublicRoute && pathname !== "/login") {
    return supabaseResponse;
  }

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.warn("Middleware auth check skipped:", err);
  }

  // 1. If NOT logged in and trying to access protected route -> Login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. If logged in...
  if (user) {
    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    // A. If on login page -> Redirect to appropriate dashboard
    if (pathname === "/login") {
      const dashboardPaths: Record<string, string> = {
        admin: "/admin",
        teacher: "/teacher",
        student: "/student",
        parent: "/parent",
      };
      const url = request.nextUrl.clone();
      url.pathname = role ? dashboardPaths[role] : "/student";
      return NextResponse.redirect(url);
    }

    // B. Verify role access for protected routes
    if (!isPublicRoute) {
      const roleRoutes: Record<string, string> = {
        admin: "/admin",
        teacher: "/teacher",
        student: "/student",
        parent: "/parent",
      };

      const isApiRoute = pathname.startsWith("/api");
      
      // If we have a role and they are trying to access another role's folder
      if (role && !isApiRoute) {
        const allowedPrefix = roleRoutes[role];
        if (!pathname.startsWith(allowedPrefix)) {
          const url = request.nextUrl.clone();
          url.pathname = allowedPrefix;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
