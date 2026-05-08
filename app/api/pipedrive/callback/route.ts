import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (code) {
    console.log("Pipedrive auth code:", code);
  }

  return NextResponse.redirect(
    new URL("/inbox", req.url)
  );
}
