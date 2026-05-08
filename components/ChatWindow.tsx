"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Mensaje, Conversacion } from "@/types";
import { formatPhone, formatDate } from "@/lib/utils";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import StatusBadge from "./StatusBadge";

interface Props {
  conversacionId: string | null;
  agenteId: string;
  agenteRol: "admin" | "agente";
}

const dateKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export default function ChatWindow({ conversacionId, agenteId, agenteRol }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Cargar mensajes
  useEffect(() => {
    if (!conversacionId) { setMensajes([]); setConversacion(null); return; }
    async function load() {
      const { data: convData } = await supabase.from("conversaciones").select("*").eq("id", conversacionId).single();
      if (convData) setConversacion(convData);
      const { data: msgsData } = await supabase.from("mensajes").select("*").eq("id_conversacion", conversacionId).order("created_at", { ascending: true });
      if (msgsData) setMensajes(msgsData);
      await supabase.from("mensajes").update({ leido: true }).eq("id_conversacion", conversacionId).eq("enviado_por", "cliente").eq("leido", false);
    }
    load();
  }, [conversacionId, supabase]);

  // Realtime + Notificaciones
  useEffect(() => {
    if (!conversacionId) return;
    const channel = supabase
      .channel(`mensajes-${conversacionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: `id_conversacion=eq.${conversacionId}` },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          setMensajes((prev) => {
            if (prev.find((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
          if (nuevo.enviado_por === "cliente") {
            supabase.from("mensajes").update({ leido: true }).eq("id", nuevo.id);

            // Notificación si no es el tab activo
            if (document.hidden || Notification.permission === "granted") {
              try {
                new Notification("Nuevo mensaje", {
                  body: nuevo.texto.slice(0, 100),
                  icon: "/favicon.ico",
                  tag: conversacionId,
                });
              } catch {}
            }

            // Sonido ligero
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.type = "sine";
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
              osc.frequency.setValueAtTime(800, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
              osc.start(); osc.stop(ctx.currentTime + 0.15);
            } catch {}
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversacionId, supabase]);

  // Pedir permiso notificaciones
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Agrupar mensajes por fecha
  const groupedMensajes = mensajes.reduce<{ fechaLabel: string; mensajes: Mensaje[] }[]>(
    (acc, msg) => {
      const label = formatDate(msg.created_at);
      const last = acc[acc.length - 1];
      if (last && last.fechaLabel === label) {
        last.mensajes.push(msg);
      } else {
        acc.push({ fechaLabel: label, mensajes: [msg] });
      }
      return acc;
    }, []);

  async function handleSend(text: string) {
    if (!conversacionId) return;
    setSending(true);
    try {
      const res = await fetch("/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_conversacion: conversacionId, texto: text }) });
      if (!res.ok) { const data = await res.json(); alert(data.error || "Error al enviar mensaje"); }
    } catch { alert("Error de conexión"); }
    finally { setSending(false); }
  }

  async function handleToggleEstado() {
    if (!conversacionId || !conversacion) return;
    setToggling(true);
    try {
      const nuevoEstado = conversacion.estado === "cerrada" ? "ia_activa" : "cerrada";
      const res = await fetch("/api/conversaciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversacionId, estado: nuevoEstado }),
      });
      if (res.ok) {
        setConversacion({ ...conversacion, estado: nuevoEstado });
      }
    } catch {} finally { setToggling(false); }
  }

  if (!conversacionId || !conversacion) return null;

  const isOwnMessage = (msg: Mensaje) => msg.enviado_por === "agente" && msg.id_agente === agenteId;

  const canReply =
    conversacion.estado !== "cerrada" &&
    (agenteRol === "admin" || (agenteRol === "agente" && conversacion.id_agente === agenteId));

  const canToggle = agenteRol === "admin" || (agenteRol === "agente" && conversacion.id_agente === agenteId);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-wa-header border-b border-wa-border">
        <div className="w-10 h-10 rounded-full bg-wa-input flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium text-sm">
            {(conversacion.nombre_cliente || conversacion.telefono_cliente).charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-medium text-sm block truncate">
            {conversacion.nombre_cliente || formatPhone(conversacion.telefono_cliente)}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge estado={conversacion.estado} />
            <span className="text-gray-400 text-[11px] truncate">{formatPhone(conversacion.telefono_cliente)}</span>
          </div>
        </div>
        {canToggle && (
          <button
            onClick={handleToggleEstado}
            disabled={toggling}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors border
              bg-wa-input hover:bg-wa-header text-gray-300 border-wa-border"
            title={conversacion.estado === "cerrada" ? "Reabrir conversación" : "Cerrar conversación"}
          >
            {toggling ? "..." : conversacion.estado === "cerrada" ? "Reabrir" : "Cerrar"}
          </button>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto bg-[#0B141A]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h60v60H0z\" fill=\"none\"/%3E%3Cpath d=\"M30 30h30M0 30h30M30 0v30M30 60V30\" stroke=\"%23182229\" stroke-width=\"0.5\"/%3E%3C/svg%3E')" }}>
        {groupedMensajes.map((group, gi) => (
          <div key={gi}>
            <div className="flex justify-center my-3 sticky top-1 z-10">
              <span className="text-[11px] text-gray-400 bg-wa-darker/90 backdrop-blur px-3 py-1 rounded-lg shadow-lg">
                {group.fechaLabel}
              </span>
            </div>
            {group.mensajes.map((msg) => (
              <MessageBubble key={msg.id} mensaje={msg} isOwn={isOwnMessage(msg)} />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canReply ? (
        <ChatInput onSend={handleSend} disabled={sending} />
      ) : (
        <div className="px-5 py-4 bg-wa-header text-center border-t border-wa-border">
          <span className="text-gray-500 text-sm">
            {conversacion.estado === "cerrada"
              ? "Conversación cerrada — usa el botón Reabrir para continuar"
              : "No tienes permiso para responder esta conversación"}
          </span>
        </div>
      )}
    </div>
  );
}
