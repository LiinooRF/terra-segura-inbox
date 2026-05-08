"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

interface AgenteRow {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  ultimo_turno: string | null;
  created_at: string;
  _conversaciones?: number;
  _asignadas?: number;
}

export default function AgentesPanel() {
  const [agentes, setAgentes] = useState<AgenteRow[]>([]);
  const [filtered, setFiltered] = useState<AgenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [tab, setTab] = useState<"todos" | "activos" | "inactivos">("todos");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "agente" });
  const supabase = createClient();

  useEffect(() => { fetchAgentes(); }, []);

  async function fetchAgentes() {
    setLoading(true);
    const res = await fetch("/api/agentes");
    if (res.ok) {
      const data: AgenteRow[] = await res.json();

      for (const a of data) {
        const { count: total } = await supabase.from("conversaciones")
          .select("*", { count: "exact", head: true }).eq("id_agente", a.id);
        const { count: activas } = await supabase.from("conversaciones")
          .select("*", { count: "exact", head: true }).eq("id_agente", a.id).eq("estado", "asignada");
        a._conversaciones = total || 0;
        a._asignadas = activas || 0;
      }

      setAgentes(data);
      applyFilter(data, search, tab);
    } else setError("Error al cargar agentes");
    setLoading(false);
  }

  function applyFilter(data: AgenteRow[], s: string, t: string) {
    let result = data;
    if (t === "activos") result = result.filter(a => a.activo);
    if (t === "inactivos") result = result.filter(a => !a.activo);
    if (s) {
      const term = s.toLowerCase();
      result = result.filter(a => a.nombre.toLowerCase().includes(term) || a.email.toLowerCase().includes(term));
    }
    setFiltered(result);
  }

  function handleSearch(val: string) { setSearch(val); applyFilter(agentes, val, tab); }
  function handleTab(t: "todos" | "activos" | "inactivos") { setTab(t); applyFilter(agentes, search, t); }

  function resetForm() {
    setForm({ nombre: "", email: "", password: "", rol: "agente" });
    setEditId(null);
    setShowModal(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const url = "/api/agentes";
    const method = editId ? "PUT" : "POST";
    const body = editId
      ? { id: editId, nombre: form.nombre, email: form.email, ...(form.password ? { password: form.password } : {}), rol: form.rol }
      : form;

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    resetForm();
    fetchAgentes();
  }

  async function toggleActivo(id: string, activo: boolean) {
    await fetch("/api/agentes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, activo: !activo }) });
    fetchAgentes();
  }

  function startEdit(a: AgenteRow) {
    setForm({ nombre: a.nombre, email: a.email, password: "", rol: a.rol });
    setEditId(a.id);
    setShowModal(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await fetch("/api/agentes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirmDelete.id, activo: false }) });
    setConfirmDelete(null);
    fetchAgentes();
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Ahora";
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }

  const stats = {
    total: agentes.length,
    activos: agentes.filter(a => a.activo).length,
    inactivos: agentes.filter(a => !a.activo).length,
    conCarga: agentes.filter(a => a._asignadas && a._asignadas > 0).length,
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold">Gestión de Agentes</h1>
          <p className="text-gray-400 text-sm mt-1">Administra los brokers que atienden las conversaciones de WhatsApp</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="px-4 py-2 bg-wa-green hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo Agente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total agentes", value: stats.total, color: "text-white", bg: "bg-wa-dark" },
          { label: "Activos", value: stats.activos, color: "text-green-400", bg: "bg-wa-dark" },
          { label: "Inactivos", value: stats.inactivos, color: "text-red-400", bg: "bg-wa-dark" },
          { label: "Con asignaciones", value: stats.conCarga, color: "text-blue-400", bg: "bg-wa-dark" },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-5 border border-wa-border`}>
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-wa-dark text-white text-sm rounded-lg pl-10 pr-4 py-2.5 border border-wa-border outline-none focus:border-wa-green-light transition-colors" />
        </div>
        <div className="flex bg-wa-dark rounded-lg border border-wa-border p-1">
          {(["todos", "activos", "inactivos"] as const).map((t) => (
            <button key={t} onClick={() => handleTab(t)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                tab === t ? "bg-wa-header text-white" : "text-gray-400 hover:text-white"}`}>{t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-wa-dark rounded-xl border border-wa-border p-12 text-center">
          <div className="animate-pulse space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-wa-header rounded-lg" />)}
          </div>
        </div>
      ) : (
        <div className="bg-wa-dark rounded-xl border border-wa-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wa-border text-gray-400 text-left text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Agente</th>
                <th className="px-6 py-4 font-medium">Rol</th>
                <th className="px-6 py-4 font-medium text-center">Estado</th>
                <th className="px-6 py-4 font-medium text-center">Asignadas</th>
                <th className="px-6 py-4 font-medium">Último turno</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-wa-border/30 hover:bg-wa-header/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${a.activo ? "bg-wa-green/20 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {a.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{a.nombre}</p>
                        <p className="text-gray-500 text-xs truncate">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${a.rol === "admin" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>{a.rol}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleActivo(a.id, a.activo)} className={`text-[11px] font-medium px-3 py-1 rounded-full transition-all hover:scale-105 ${a.activo ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}>
                      {a.activo ? "✓ Activo" : "✕ Inactivo"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {a._asignadas ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-wa-green-light/20 text-wa-green-light text-xs font-bold">{a._asignadas}</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(a.ultimo_turno)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(a)} className="p-2 text-gray-400 hover:text-white hover:bg-wa-input rounded-lg transition-colors" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => setConfirmDelete({ id: a.id, nombre: a.nombre })} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Desactivar">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center"><p className="text-gray-500">No se encontraron agentes</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => resetForm()}>
          <div className="bg-wa-dark rounded-2xl border border-wa-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-lg font-bold">{editId ? "Editar Agente" : "Nuevo Agente"}</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-white p-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Nombre completo</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Carlos López" className="w-full bg-wa-input text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-wa-green-light/30 transition-all" required />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Correo electrónico</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="agente@terrasegura.com" className="w-full bg-wa-input text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-wa-green-light/30 transition-all" required />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Contraseña {editId && <span className="text-gray-500">(dejar vacía para no cambiar)</span>}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editId ? "••••••••" : "Mínimo 6 caracteres"} className="w-full bg-wa-input text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-wa-green-light/30 transition-all" required={!editId} />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Rol</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["agente", "admin"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setForm({ ...form, rol: r })}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.rol === r ? "border-wa-green-light bg-wa-green-light/10 text-wa-green-light" : "border-wa-border text-gray-400 hover:border-gray-500"}`}>
                      {r === "admin" ? "🔧 Admin" : "💬 Agente"}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2.5">{error}</div>}
              <button type="submit" className="w-full py-2.5 bg-wa-green hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editId ? "Guardar Cambios" : "Crear Agente"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Desactivación */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-wa-dark rounded-2xl border border-wa-border w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-red-400"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <h3 className="text-white font-bold text-lg mb-1">¿Desactivar agente?</h3>
              <p className="text-gray-400 text-sm">{confirmDelete.nombre} ya no podrá acceder al inbox ni recibir nuevas conversaciones.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 bg-wa-header text-white text-sm rounded-lg hover:bg-wa-input transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">Desactivar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
