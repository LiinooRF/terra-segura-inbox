import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";
import { sendWhatsAppMessage } from "@/lib/zavu";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id_conversacion, texto } = await req.json();

    if (!id_conversacion || !texto) {
      return NextResponse.json(
        { error: "Conversación y texto requeridos" },
        { status: 400 }
      );
    }

    // Obtener conversación
    const { data: convs, error: convErr } = await supabase
      .from("conversaciones")
      .select("*")
      .eq("id", id_conversacion)
      .single();

    if (convErr || !convs) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    const conv = convs;

    // Verificar permisos
    const canReply =
      session.rol === "admin" ||
      (session.rol === "agente" && conv.id_agente === session.id);

    if (!canReply) {
      return NextResponse.json(
        { error: "No tienes permiso para responder esta conversación" },
        { status: 403 }
      );
    }

    if (conv.estado === "cerrada") {
      return NextResponse.json(
        { error: "La conversación está cerrada" },
        { status: 400 }
      );
    }

    // Round-robin: si admin responde a conversación IA, asignar al siguiente agente
    if (session.rol === "admin" && conv.estado === "ia_activa") {
      const { data: agentesData } = await supabase
        .from("agentes")
        .select("id,nombre")
        .eq("activo", true)
        .eq("rol", "agente")
        .order("ultimo_turno", { ascending: true, nullsFirst: true })
        .limit(1);

      const agenteAsignado = agentesData?.[0] || session;

      await supabase
        .from("conversaciones")
        .update({
          id_agente: agenteAsignado.id,
          estado: "asignada",
        })
        .eq("id", conv.id);

      await supabase
        .from("agentes")
        .update({ ultimo_turno: new Date().toISOString() })
        .eq("id", agenteAsignado.id);

      // Guardar mensaje de sistema: conversación asignada
      await supabase.from("mensajes").insert({
        id_conversacion,
        texto: `Conversación asignada a ${agenteAsignado.nombre}`,
        enviado_por: "ia",
      });
    }

    // Insertar mensaje
    const { data: mensaje, error: msgErr } = await supabase
      .from("mensajes")
      .insert({
        id_conversacion,
        texto,
        enviado_por: "agente",
        id_agente: session.id,
      })
      .select()
      .single();

    if (msgErr) {
      return NextResponse.json(
        { error: "Error al guardar mensaje" },
        { status: 500 }
      );
    }

    // Actualizar conversación
    await supabase
      .from("conversaciones")
      .update({
        ultimo_mensaje: texto,
        ultimo_mensaje_at: new Date().toISOString(),
        ultimo_mensaje_por: "agente",
      })
      .eq("id", id_conversacion);

    // Enviar vía Zavu
    try {
      await sendWhatsAppMessage(conv.telefono_cliente, texto);
    } catch (zavuErr) {
      console.error("Zavu send error:", zavuErr);
    }

    return NextResponse.json(mensaje);
  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
