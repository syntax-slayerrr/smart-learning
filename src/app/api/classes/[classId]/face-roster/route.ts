import { NextRequest } from "next/server";
import { GET as handleGet } from "../daftar-wajah/route";

interface RouteParams {
  params: Promise<{
    classId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  return handleGet(request, context);
}
