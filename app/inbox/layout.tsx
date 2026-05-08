"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AuthPayload } from "@/types";
import ConversationList from "@/components/ConversationList";
import EmptyState from "@/components/EmptyState";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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
          selectedId={null}
          onSelect={(id) => router.push(`/inbox/${id}`)}
          agenteId={agente.id}
          rol={agente.rol}
        />
      </div>
      <div className="flex-1 flex">
        <EmptyState />
      </div>
    </div>
  );
}
