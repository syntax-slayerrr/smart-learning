import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target") || "status";
  const tunnelUrl =
    process.env.NEXT_PUBLIC_EDGE_SERVER || "https://bra-boxing-evident-resumes.trycloudflare.com";

  try {
    if (target === "video_feed") {
      const feedRes = await fetch(`${tunnelUrl}/video_feed`, {
        cache: "no-store",
        headers: { Accept: "multipart/x-mixed-replace" },
      });

      if (!feedRes.ok || !feedRes.body) {
        return NextResponse.json({ error: "Camera stream unavailable" }, { status: 502 });
      }

      return new Response(feedRes.body, {
        headers: {
          "Content-Type":
            feedRes.headers.get("Content-Type") || "multipart/x-mixed-replace; boundary=frame",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    if (target === "switch_camera") {
      const source = searchParams.get("source") || "0";
      const switchRes = await fetch(`${tunnelUrl}/switch_camera?source=${encodeURIComponent(source)}`, {
        cache: "no-store",
      });
      const data = await switchRes.json();
      return NextResponse.json(data);
    }

    if (target === "rotate") {
      const deg = searchParams.get("deg");
      const flip = searchParams.get("flip");
      const q = new URLSearchParams();
      if (deg) q.set("deg", deg);
      if (flip) q.set("flip", flip);
      const rotateRes = await fetch(`${tunnelUrl}/rotate?${q.toString()}`, { cache: "no-store" });
      const data = await rotateRes.json();
      return NextResponse.json(data);
    }

    // Default: proxy /status
    const statusRes = await fetch(`${tunnelUrl}/status`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const data = await statusRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to connect to edge camera server", details: error.message },
      { status: 502 }
    );
  }
}
