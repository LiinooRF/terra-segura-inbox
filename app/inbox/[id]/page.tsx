"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatWindow from "@/components/ChatWindow";
import { useAuth } from "@/components/AuthProvider";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const agente = useAuth();

  useEffect(() => {
    if (!agente) router.push("/login");
  }, [agente, router]);

  if (!agente) return null;

  const conversacionId = params.id as string;

  return (
    <ChatWindow
      conversacionId={conversacionId}
      agenteId={agente.id}
      agenteRol={agente.rol}
    />
  );
}
