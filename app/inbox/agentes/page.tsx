"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AgentesPanel from "@/components/AgentesPanel";

export default function AgentesPage() {
  const agente = useAuth();
  const router = useRouter();

  if (!agente) return null;
  if (agente.rol !== "admin") {
    router.push("/inbox");
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B141A]">
      <AgentesPanel />
    </div>
  );
}
