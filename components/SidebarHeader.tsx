"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function SidebarHeader() {
  const agente = useAuth()!;
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="p-3 border-b border-wa-border">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-white font-bold text-lg">Terra Segura</h1>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-wa-header text-gray-300 capitalize">
          {agente.rol}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-medium truncate max-w-[180px]">
            {agente.nombre}
          </p>
          <p className="text-gray-500 text-[11px] truncate max-w-[180px]">
            {agente.email}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {agente.rol === "admin" && (
            <button
              onClick={() => router.push("/inbox/agentes")}
              className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-wa-input transition-colors"
              title="Administrar agentes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400 p-1.5 rounded-md hover:bg-wa-input transition-colors"
            title="Cerrar sesión"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
