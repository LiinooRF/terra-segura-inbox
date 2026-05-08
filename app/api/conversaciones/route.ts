import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = getSupabase();
  const { id, estado } = await req.json();
  if (!id || !estado) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  // Verificar permisos
  const { data: conv } = await supabase.from("conversaciones").select("id_agente").eq("id", id).single();
  if (!conv) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const canManage = session.rol === "admin" || (session.rol === "agente" && conv.id_agente === session.id);
  if (!canManage) return NextResponse.json({ error: "No tienes permiso" }, { status: 403 });

  const { error } = await supabase.from("conversaciones").update({ estado }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, estado });
}
