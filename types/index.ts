export interface Agente {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "agente";
  activo: boolean;
  ultimo_turno: string | null;
  created_at: string;
}

export interface Conversacion {
  id: string;
  telefono_cliente: string;
  nombre_cliente: string | null;
  id_agente: string | null;
  estado: "ia_activa" | "asignada" | "cerrada";
  ultimo_mensaje: string | null;
  ultimo_mensaje_at: string | null;
  ultimo_mensaje_por: string | null;
  created_at: string;
  // Joined fields
  agente?: { id: string; nombre: string } | null;
  no_leidos?: number;
}

export interface Mensaje {
  id: string;
  id_conversacion: string;
  texto: string;
  enviado_por: "cliente" | "ia" | "agente";
  id_agente: string | null;
  leido: boolean;
  created_at: string;
}

export interface AuthPayload {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "agente";
}
