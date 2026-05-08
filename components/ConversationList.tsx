"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { Conversacion } from "@/types";
import { cn, formatPhone, formatTime } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import SidebarHeader from "./SidebarHeader";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  agenteId: string;
  rol: "admin" | "agente";
}

export default function ConversationList({
  selectedId,
  onSelect,
  agenteId,
  rol,
}: Props) {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchConversaciones = useCallback(async () => {
    let query = supabase
      .from("conversaciones")
      .select("*")
      .order("ultimo_mensaje_at", { ascending: false, nullsFirst: false });

    if (rol === "agente") {
      query = query.eq("id_agente", agenteId).eq("estado", "asignada");
    }

    const { data, error } = await query;

    if (!error && data) {
      const convs: Conversacion[] = data;

      const conversacionesWithUnread = await Promise.all(
        convs.map(async (conv) => {
          const { count } = await supabase
            .from("mensajes")
            .select("*", { count: "exact", head: true })
            .eq("id_conversacion", conv.id)
            .eq("enviado_por", "cliente")
            .eq("leido", false);
          return { ...conv, no_leidos: count || 0 };
        })
      );

      setConversaciones(conversacionesWithUnread);
    }
    setLoading(false);
  }, [supabase, agenteId, rol]);

  useEffect(() => {
    fetchConversaciones();

    const channel = supabase
      .channel("conversaciones-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversaciones",
        },
        () => {
          fetchConversaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversaciones, supabase]);

  const filtered = conversaciones.filter((c) => {
    const term = search.toLowerCase();
    return (
      (c.nombre_cliente && c.nombre_cliente.toLowerCase().includes(term)) ||
      c.telefono_cliente.includes(term)
    );
  });

  return (
    <div className="flex flex-col h-full bg-wa-dark border-r border-wa-border">
      <SidebarHeader />
      <div className="p-3 border-b border-wa-border">
        <input
          type="text"
          placeholder="Buscar conversación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-wa-input text-white text-sm rounded-lg px-3 py-2
                     placeholder-gray-500 outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="text-gray-500 text-sm text-center py-8">
            Cargando conversaciones...
          </p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">
            {search ? "Sin resultados" : "No hay conversaciones aún"}
          </p>
        )}

        {filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full flex items-start gap-3 px-4 py-3 hover:bg-wa-header transition-colors text-left border-b border-wa-border/50",
              selectedId === conv.id && "bg-wa-header"
            )}
          >
            <div className="w-11 h-11 rounded-full bg-wa-header flex-shrink-0 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {(conv.nombre_cliente || conv.telefono_cliente)
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium truncate">
                  {conv.nombre_cliente || formatPhone(conv.telefono_cliente)}
                </span>
                <span className="text-gray-500 text-[11px] flex-shrink-0 ml-2">
                  {conv.ultimo_mensaje_at
                    ? formatTime(conv.ultimo_mensaje_at)
                    : ""}
                </span>
              </div>

              <div className="flex items-center justify-between mt-0.5">
                <span className="text-gray-400 text-xs truncate pr-2">
                  {conv.ultimo_mensaje || "Conversación nueva"}
                </span>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <StatusBadge estado={conv.estado} />
                  {conv.no_leidos ? (
                    <span className="bg-wa-green-light text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {conv.no_leidos}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
