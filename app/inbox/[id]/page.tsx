"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AuthPayload } from "@/types";
import ConversationList from "@/components/ConversationList";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversacionId = params.id as string;
  const [agente, setAgente] = useState<AuthPayload | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setAgente(data);
      });
  }, [router]);

  if (!agente) {
    return (
      <div className="h-screen bg-wa-darker flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      <div className="w-[380px] flex-shrink-0">
        <ConversationList
          selectedId={conversacionId}
          onSelect={(id) => router.push(`/inbox/${id}`)}
          agenteId={agente.id}
          rol={agente.rol}
        />
      </div>
      <div className="flex-1 flex">
        <ChatWindow
          conversacionId={conversacionId}
          agenteId={agente.id}
          agenteRol={agente.rol}
        />
      </div>
    </div>
  );
}
