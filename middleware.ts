import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const config = {
  matcher: ["/inbox/:path*", "/api/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/webhooks") || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  let token = request.cookies.get("terra_token")?.value;

  // Si no hay cookie, intentar autenticación por ?token= (para iframes sin third-party cookies)
  if (!token) {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      const payload = await verifyToken(urlToken);
      if (payload) {
        // Setear la cookie y continuar
        const res = NextResponse.next();
        res.cookies.set("terra_token", urlToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 60 * 60 * 24,
        });
        return res;
      }
    }
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("terra_token");
    return res;
  }

  return NextResponse.next();
}
