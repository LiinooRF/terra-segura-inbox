import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signToken, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña requeridos" },
        { status: 400 }
      );
    }

    const { data: agentes, error } = await supabase
      .from("agentes")
      .select("*")
      .eq("email", email)
      .eq("activo", true)
      .limit(1);

    if (error || !agentes || agentes.length === 0) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const agente = agentes[0];

    const valid = await bcrypt.compare(password, agente.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const token = await signToken({
      id: agente.id,
      nombre: agente.nombre,
      email: agente.email,
      rol: agente.rol,
    });

    const res = NextResponse.json({
      id: agente.id,
      nombre: agente.nombre,
      email: agente.email,
      rol: agente.rol,
    });

    await setSessionCookie(token);

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
