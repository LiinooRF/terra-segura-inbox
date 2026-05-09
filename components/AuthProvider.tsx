"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthPayload } from "@/types";

const AuthContext = createContext<AuthPayload | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agente, setAgente] = useState<AuthPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Intentar leer de URL params primero (iframe-friendly)
    const nombre = searchParams.get("nombre");
    const rol = searchParams.get("rol") as "admin" | "agente" | null;
    const uid = searchParams.get("uid");

    if (nombre && rol && uid) {
      // Autenticado via URL params (sin cookies)
      setAgente({ id: uid, nombre, email: "", rol });
      return;
    }

    // Fallback: fetch con cookie
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch("/api/auth/me", { signal: controller.signal, credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setAgente(data);
      })
      .catch(() => setError(true))
      .finally(() => clearTimeout(timeout));

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="h-screen bg-wa-darker flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">Error de conexión</p>
          <button onClick={() => { setError(false); window.location.reload(); }}
            className="px-4 py-2 bg-wa-green text-white text-sm rounded-lg hover:bg-green-700">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!agente) {
    return (
      <div className="h-screen bg-wa-darker flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={agente}>{children}</AuthContext.Provider>;
}
