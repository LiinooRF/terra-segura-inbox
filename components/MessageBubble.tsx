"use client";

import { cn, formatTime } from "@/lib/utils";
import type { Mensaje } from "@/types";

interface Props {
  mensaje: Mensaje;
  isOwn: boolean;
}

export default function MessageBubble({ mensaje, isOwn }: Props) {
  const isIA = mensaje.enviado_por === "ia";
  const isCliente = mensaje.enviado_por === "cliente";
  const isAgente = mensaje.enviado_por === "agente";

  return (
    <div className={cn("flex mb-1 px-9", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[65%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isCliente && "bg-wa-incoming text-gray-100",
          isIA && "bg-[#1F2C33] text-gray-300",
          isAgente && "bg-wa-outgoing-dark text-gray-100"
        )}
      >
        {isIA && (
          <div className="text-[10px] text-blue-400 font-medium mb-0.5">🤖 IA</div>
        )}

        {isAgente && isOwn && (
          <div className="text-[10px] text-green-400 font-medium mb-0.5">Tú</div>
        )}

        {isAgente && !isOwn && (
          <div className="text-[10px] text-green-400 font-medium mb-0.5">Agente</div>
        )}

        <p className="whitespace-pre-wrap break-words">{mensaje.texto}</p>

        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10px] opacity-60">
            {formatTime(mensaje.created_at)}
          </span>
          {isOwn && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 11"
              className="w-3 h-3 opacity-60"
            >
              <path
                fill="currentColor"
                d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.317.143.536.536 0 0 0-.165.36c-.01.135.04.263.138.357l2.356 2.456a.47.47 0 0 0 .339.161.483.483 0 0 0 .352-.18l5.168-6.013-1.202-2.055a.499.499 0 0 0 .553-.693ZM4.905 2.305l1.192 2.04L10.72.787a.484.484 0 0 1 .38-.178.458.458 0 0 1 .304.103.497.497 0 0 1 .137.686l-1.2 2.054 5.147-5.99a.48.48 0 0 1 .351-.18.472.472 0 0 1 .339.16.537.537 0 0 1 .138.358c.01.136-.04.264-.165.361l-2.356 2.456a.47.47 0 0 1-.336.153.458.458 0 0 1-.317-.143L4.905 2.305Z"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
