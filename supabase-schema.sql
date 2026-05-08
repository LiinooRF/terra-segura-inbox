-- ============================================================
-- Terra Segura - Supabase Schema
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

-- Habilitar extensión uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tabla: agentes
-- ============================================================
CREATE TABLE IF NOT EXISTS agentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'agente' CHECK (rol IN ('admin', 'agente')),
  activo BOOLEAN DEFAULT true,
  ultimo_turno TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Tabla: conversaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS conversaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefono_cliente TEXT NOT NULL,
  nombre_cliente TEXT,
  id_agente UUID REFERENCES agentes(id),
  estado TEXT NOT NULL DEFAULT 'ia_activa' CHECK (estado IN ('ia_activa', 'asignada', 'cerrada')),
  ultimo_mensaje TEXT,
  ultimo_mensaje_at TIMESTAMPTZ,
  ultimo_mensaje_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Tabla: mensajes
-- ============================================================
CREATE TABLE IF NOT EXISTS mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_conversacion UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  enviado_por TEXT NOT NULL CHECK (enviado_por IN ('cliente', 'ia', 'agente')),
  id_agente UUID REFERENCES agentes(id),
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversaciones_telefono ON conversaciones(telefono_cliente);
CREATE INDEX IF NOT EXISTS idx_conversaciones_estado ON conversaciones(estado);
CREATE INDEX IF NOT EXISTS idx_conversaciones_agente ON conversaciones(id_agente);
CREATE INDEX IF NOT EXISTS idx_conversaciones_mensaje_at ON conversaciones(ultimo_mensaje_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes(id_conversacion, created_at);
CREATE INDEX IF NOT EXISTS idx_agentes_ultimo_turno ON agentes(ultimo_turno ASC NULLS FIRST);

-- ============================================================
-- Habilitar Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE conversaciones;

-- ============================================================
-- RLS - Permitir acceso público a mensajes y conversaciones
-- (El control de acceso se hace en la app Next.js via JWT)
-- ============================================================
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;

-- Política: permitir SELECT a todo (usando anon key)
-- La app Next.js filtra los datos según el rol del agente autenticado
CREATE POLICY "Permitir select mensajes" ON mensajes FOR SELECT USING (true);
CREATE POLICY "Permitir insert mensajes" ON mensajes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update mensajes" ON mensajes FOR UPDATE USING (true);

CREATE POLICY "Permitir select conversaciones" ON conversaciones FOR SELECT USING (true);
CREATE POLICY "Permitir insert conversaciones" ON conversaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update conversaciones" ON conversaciones FOR UPDATE USING (true);

CREATE POLICY "Permitir select agentes" ON agentes FOR SELECT USING (true);
CREATE POLICY "Permitir insert agentes" ON agentes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update agentes" ON agentes FOR UPDATE USING (true);
