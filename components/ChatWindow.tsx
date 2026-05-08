"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Mensaje, Conversacion } from "@/types";
import { formatPhone } from "@/lib/utils";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import StatusBadge from "./StatusBadge";

interface Props {
  conversacionId: string | null;
  agenteId: string;
  agenteRol: "admin" | "agente";
}

export default function ChatWindow({
  conversacionId,
  agenteId,
  agenteRol,
}: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Cargar mensajes
  useEffect(() => {
    if (!conversacionId) {
      setMensajes([]);
      setConversacion(null);
      return;
    }

    async function load() {
      const { data: convData } = await supabase
        .from("conversaciones")
        .select("*")
        .eq("id", conversacionId)
        .single();

      if (convData) setConversacion(convData);

      const { data: msgsData } = await supabase
        .from("mensajes")
        .select("*")
        .eq("id_conversacion", conversacionId)
        .order("created_at", { ascending: true });

      if (msgsData) setMensajes(msgsData);

      // Marcar como leídos
      await supabase
        .from("mensajes")
        .update({ leido: true })
        .eq("id_conversacion", conversacionId)
        .eq("enviado_por", "cliente")
        .eq("leido", false);
    }

    load();
  }, [conversacionId, supabase]);

  // Realtime
  useEffect(() => {
    if (!conversacionId) return;

    const channel = supabase
      .channel(`mensajes-${conversacionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `id_conversacion=eq.${conversacionId}`,
        },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          setMensajes((prev) => {
            if (prev.find((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });

          // Marcar como leído si es del cliente
          if (nuevo.enviado_por === "cliente") {
            supabase
              .from("mensajes")
              .update({ leido: true })
              .eq("id", nuevo.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversacionId, supabase]);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Agrupar mensajes por fecha
  const groupedMensajes = mensajes.reduce<
    { fecha: string; mensajes: Mensaje[] }[]
  >((acc, msg) => {
    const fecha = new Date(msg.created_at).toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const last = acc[acc.length - 1];
    if (last && last.fecha === fecha) {
      last.mensajes.push(msg);
    } else {
      acc.push({ fecha, mensajes: [msg] });
    }
    return acc;
  }, []);

  async function handleSend(text: string) {
    if (!conversacionId) return;
    setSending(true);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_conversacion: conversacionId,
          texto: text,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al enviar mensaje");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setSending(false);
    }
  }

  if (!conversacionId || !conversacion) return null;

  const isOwnMessage = (msg: Mensaje) =>
    msg.enviado_por === "agente" && msg.id_agente === agenteId;

  const canReply =
    conversacion.estado !== "cerrada" &&
    (agenteRol === "admin" ||
      (agenteRol === "agente" && conversacion.id_agente === agenteId));

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-wa-header border-b border-wa-border">
        <div className="w-10 h-10 rounded-full bg-wa-input flex items-center justify-center">
          <span className="text-white font-medium text-sm">
            {(conversacion.nombre_cliente || conversacion.telefono_cliente)
              .charAt(0)
              .toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <span className="text-white font-medium text-sm block">
            {conversacion.nombre_cliente ||
              formatPhone(conversacion.telefono_cliente)}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge estado={conversacion.estado} />
            <span className="text-gray-400 text-[11px]">
              {formatPhone(conversacion.telefono_cliente)}
            </span>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div
        className="flex-1 overflow-y-auto bg-[#0B141A] bg-cover"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M30 30h30M0 30h30M30 0v30M30 60V30' stroke='%23182229' stroke-width='0.5'/%3E%3C/svg%3E')",
        }}
      >
        {groupedMensajes.map((group, gi) => (
          <div key={gi}>
            <div className="flex justify-center my-3">
              <span className="text-[11px] text-gray-500 bg-wa-darker px-3 py-1 rounded-md">
                {group.fecha}
              </span>
            </div>
            {group.mensajes.map((msg) => (
              <MessageBubble
                key={msg.id}
                mensaje={msg}
                isOwn={isOwnMessage(msg)}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canReply ? (
        <ChatInput onSend={handleSend} disabled={sending} />
      ) : (
        <div className="px-5 py-4 bg-wa-header text-center">
          <span className="text-gray-500 text-sm">
            {conversacion.estado === "cerrada"
              ? "Esta conversación está cerrada"
              : "No tienes permiso para responder esta conversación"}
          </span>
        </div>
      )}
    </div>
  );
}
