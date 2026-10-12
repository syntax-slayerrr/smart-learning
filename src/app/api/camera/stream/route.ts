import { NextRequest, NextResponse } from "next/server";
import { validateTunnelUrl } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target") || "status";
  const queryTunnel = searchParams.get("tunnel");
  const headerTunnel = req.headers.get("x-tunnel-url");

  // Validate tunnel url against SSRF attacks (RFC1918 / Cloud Metadata / Loopback)
  const tunnelUrl =
    validateTunnelUrl(queryTunnel) ||
    validateTunnelUrl(headerTunnel) ||
    validateTunnelUrl(process.env.NEXT_PUBLIC_EDGE_SERVER) ||
    "https://smart-learning.de.deplexo.com";

  try {
    if (target === "video_feed") {
      const classId = searchParams.get("class_id") || searchParams.get("channel");
      const feedUrl = classId
        ? `${tunnelUrl}/video_feed?class_id=${encodeURIComponent(classId)}`
        : `${tunnelUrl}/video_feed`;

      const feedRes = await fetch(feedUrl, {
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
          "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
          "X-Accel-Buffering": "no",
          Connection: "keep-alive",
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
      const classId = searchParams.get("class_id");
      const q = new URLSearchParams();
      if (deg) q.set("deg", deg);
      if (flip) q.set("flip", flip);
      if (classId) q.set("class_id", classId);
      const rotateRes = await fetch(`${tunnelUrl}/rotate?${q.toString()}`, { cache: "no-store" });
      const data = await rotateRes.json();
      return NextResponse.json(data);
    }

    // Default: proxy /status
    const classId = searchParams.get("class_id");
    const statusUrl = classId ? `${tunnelUrl}/status?class_id=${encodeURIComponent(classId)}` : `${tunnelUrl}/status`;
    const statusRes = await fetch(statusUrl, {
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
