import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    console.error("Pipedrive auth error:", error);
    return NextResponse.redirect(new URL("/inbox?error=auth_failed", req.url));
  }

  if (code) {
    // Guardar el code para intercambiarlo por el access token
    // El intercambio se hace server-side con client_id + client_secret
    console.log("Pipedrive auth code received:", code.slice(0, 10) + "...");

    // Intercambiar code por access token
    try {
      const tokenRes = await fetch("https://oauth.pipedrive.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: "https://inbox.linorequena.xyz/auth/pipedrive/callback",
          client_id: process.env.PIPEDRIVE_CLIENT_ID || "",
          client_secret: process.env.PIPEDRIVE_CLIENT_SECRET || "",
        }),
      });

      if (tokenRes.ok) {
        const tokens = await tokenRes.json();
        console.log("Pipedrive access token obtained");
        // En producción guardar tokens.access_token y tokens.refresh_token en BD
      } else {
        console.error("Token exchange failed:", await tokenRes.text());
      }
    } catch (err) {
      console.error("Token exchange error:", err);
    }
  }

  return NextResponse.redirect(new URL("/inbox", req.url));
}
