import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const state = req.nextUrl.searchParams.get("state");

  // Error: usuario denegó
  if (error) {
    console.error("Pipedrive OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/inbox?pipedrive_error=${error}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/inbox?pipedrive_error=no_code", req.url)
    );
  }

  const clientId = process.env.PIPEDRIVE_CLIENT_ID;
  const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Pipedrive credentials not configured");
    return NextResponse.redirect(
      new URL("/inbox?pipedrive_error=no_credentials", req.url)
    );
  }

  try {
    // Basic Auth: base64(client_id:client_secret)
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // Intercambiar authorization_code por access_token + refresh_token
    const tokenRes = await fetch("https://oauth.pipedrive.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://inbox.linorequena.xyz/auth/pipedrive/callback",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Pipedrive token exchange failed:", errText);
      return NextResponse.redirect(
        new URL("/inbox?pipedrive_error=token_exchange_failed", req.url)
      );
    }

    const tokens = await tokenRes.json();

    // Guardar tokens en Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Guardar o actualizar tokens (usamos el api_domain como identificador único)
    const { error: dbError } = await supabase.from("pipedrive_tokens").upsert(
      {
        api_domain: tokens.api_domain,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        metadata: { state },
      },
      { onConflict: "api_domain" }
    );

    if (dbError) {
      console.error("Error guardando tokens:", dbError.message);
    }

    console.log(`Pipedrive OAuth OK — domain: ${tokens.api_domain}`);
    return NextResponse.redirect(new URL("/inbox?pipedrive=connected", req.url));
  } catch (err: any) {
    console.error("OAuth callback error:", err.message);
    return NextResponse.redirect(
      new URL("/inbox?pipedrive_error=exception", req.url)
    );
  }
}
