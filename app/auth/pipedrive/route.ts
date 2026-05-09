import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.PIPEDRIVE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "PIPEDRIVE_CLIENT_ID no configurado" },
      { status: 500 }
    );
  }

  // Generar state aleatorio para seguridad (anti-CSRF)
  const state =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: "https://inbox.linorequena.xyz/auth/pipedrive/callback",
    state,
  });

  return NextResponse.redirect(
    `https://oauth.pipedrive.com/oauth/authorize?${params}`
  );
}
