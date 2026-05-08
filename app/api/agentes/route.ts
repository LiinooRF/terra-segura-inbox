import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/agentes - listar agentes
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agentes")
    .select("id,nombre,email,rol,activo,ultimo_turno,created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/agentes - crear agente
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = getSupabase();
  const { nombre, email, password, rol } = await req.json();

  if (!nombre || !email || !password) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("agentes")
    .insert({ nombre, email, password_hash: hash, rol: rol || "agente", activo: true })
    .select("id,nombre,email,rol,activo,created_at")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "El email ya existe" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT /api/agentes - actualizar agente
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = getSupabase();
  const { id, nombre, email, password, rol, activo } = await req.json();

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (nombre) updates.nombre = nombre;
  if (email) updates.email = email;
  if (rol) updates.rol = rol;
  if (typeof activo === "boolean") updates.activo = activo;
  if (password) updates.password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("agentes")
    .update(updates)
    .eq("id", id)
    .select("id,nombre,email,rol,activo")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
