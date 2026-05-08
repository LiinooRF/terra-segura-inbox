"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AuthPayload } from "@/types";

const AuthContext = createContext<AuthPayload | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  return <AuthContext.Provider value={agente}>{children}</AuthContext.Provider>;
}
