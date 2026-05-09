import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/auth";

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

  if (error || !data || new Date(data.expires_at) < new Date()) {
    return NextResponse.redirect(`${BASE_URL}/login`);
  }

  // Decodificar el JWT para pasar datos del usuario en la URL
  // Así el cliente no necesita cookies para saber quién es
  const payload = await verifyToken(data.token);
  const userParams = payload
    ? `&nombre=${encodeURIComponent(payload.nombre)}&rol=${payload.rol}&uid=${payload.id}`
    : "";

  const res = NextResponse.redirect(
    `${BASE_URL}/inbox?code=${params.code}${userParams}`
  );

  // Cookie por si el navegador la acepta
  res.cookies.set("terra_token", data.token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}
