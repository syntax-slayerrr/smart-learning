import { NextRequest } from "next/server";
import { POST as handlePost } from "../../uji-lisan/buat/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handlePost(request);
}
