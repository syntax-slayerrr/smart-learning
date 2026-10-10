import { NextRequest, NextResponse } from "next/server";
import { GET as handleEngineGet, POST as handleEnginePost } from "../api/camera/engine/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleEngineGet(request);
}

export async function POST() {
  return handleEnginePost();
}
