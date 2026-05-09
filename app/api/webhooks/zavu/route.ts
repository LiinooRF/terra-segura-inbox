import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const N8N_WEBHOOK_URL = "https://n8n.linorequena.xyz/webhook/zavu-inbound";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await req.json();

    // Zavu manda eventos con estructura: { type, data: { from, text, ... }, timestamp }
    // A veces el payload viene directo sin envoltura
    const telefono = body.data?.from || body.from;
    const texto = body.data?.text || body.text;
    const eventType = body.type || "message.inbound";

    if (!telefono || !texto) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    // 1. Buscar o crear conversación
    const { data: existentes } = await supabase
      .from("conversaciones")
      .select("id,estado")
      .eq("telefono_cliente", telefono)
      .limit(1);

    let idConversacion: string;

    if (existentes && existentes.length > 0) {
      const conv = existentes[0];
      idConversacion = conv.id;

      // Si estaba cerrada, reabrir con IA
      if (conv.estado === "cerrada") {
        await supabase
          .from("conversaciones")
          .update({ estado: "ia_activa" })
          .eq("id", idConversacion);
      }
    } else {
      const { data: nueva } = await supabase
        .from("conversaciones")
        .insert({
          telefono_cliente: telefono,
          estado: "ia_activa",
          ultimo_mensaje: texto,
          ultimo_mensaje_at: new Date().toISOString(),
          ultimo_mensaje_por: "cliente",
        })
        .select("id")
        .single();

      if (!nueva) {
        return NextResponse.json({ error: "Error al crear conversación" }, { status: 500 });
      }
      idConversacion = nueva.id;
    }

    // 2. Guardar mensaje
    await supabase.from("mensajes").insert({
      id_conversacion: idConversacion,
      texto,
      enviado_por: "cliente",
    });

    // 3. Actualizar conversación
    await supabase
      .from("conversaciones")
      .update({
        ultimo_mensaje: texto,
        ultimo_mensaje_at: new Date().toISOString(),
        ultimo_mensaje_por: "cliente",
      })
      .eq("id", idConversacion);

    // 4. Responder 200 inmediatamente
    const response = NextResponse.json({ ok: true, conv_id: idConversacion }, { status: 200 });

    // 5. Reenviar a n8n en background (no bloquea la respuesta)
    fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch((err) => {
      console.error("Error reenviando a n8n:", err.message);
    });

    return response;
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
