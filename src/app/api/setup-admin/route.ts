import { NextResponse } from "next/server";

export async function GET() {
  // This endpoint has been disabled for security.
  // Admin account has already been created.
  return NextResponse.json(
    { error: "Endpoint ini telah dinonaktifkan untuk keamanan." },
    { status: 403 }
  );
}
