import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://inbox.linorequena.xyz";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("session_codes")
    .select("token, expires_at")
    .eq("code", params.code)
    .single();

  if (error || !data) {
    return NextResponse.redirect(`${BASE_URL}/login`);
  }

  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("session_codes").delete().eq("code", params.code);
    return NextResponse.redirect(`${BASE_URL}/login`);
  }

  const res = NextResponse.redirect(`${BASE_URL}/inbox`);
  res.cookies.set("terra_token", data.token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
