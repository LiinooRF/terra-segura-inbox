"use client";

import { useState, useEffect } from "react";

interface AgenteRow {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  ultimo_turno: string | null;
  created_at: string;
}

export default function AgentesPanel() {
  const [agentes, setAgentes] = useState<AgenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "agente" });

  useEffect(() => { fetchAgentes(); }, []);

  async function fetchAgentes() {
    setLoading(true);
    const res = await fetch("/api/agentes");
    if (res.ok) setAgentes(await res.json());
    else setError("Error al cargar agentes");
    setLoading(false);
  }

  function resetForm() {
    setForm({ nombre: "", email: "", password: "", rol: "agente" });
    setEditId(null);
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (editId) {
      const updates: Record<string, unknown> = { id: editId };
      if (form.nombre) updates.nombre = form.nombre;
      if (form.email) updates.email = form.email;
      if (form.password) updates.password = form.password;
      if (form.rol) updates.rol = form.rol;
      const res = await fetch("/api/agentes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
    } else {
      const res = await fetch("/api/agentes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
    }
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
    setShowForm(true);
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`Desactivar a ${nombre}?`)) return;
    await fetch("/api/agentes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, activo: false }) });
    fetchAgentes();
  }

  function formatDate(iso: string | null) {
    if (!iso) return "Nunca";
    return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold">Agentes</h1>
          <p className="text-gray-400 text-sm mt-1">Administra los agentes que atienden conversaciones</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-wa-green hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
          {showForm ? "Cancelar" : "+ Nuevo Agente"}
        </button>
      </div>

      {error && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-wa-dark rounded-xl p-6 border border-wa-border">
          <h2 className="text-white font-semibold mb-4">{editId ? "Editar Agente" : "Nuevo Agente"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Nombre</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full bg-wa-input text-white rounded-lg px-3 py-2 text-sm outline-none" required />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-wa-input text-white rounded-lg px-3 py-2 text-sm outline-none" required />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">Contrasena {editId ? "(dejar vacio para no cambiar)" : ""}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-wa-input text-white rounded-lg px-3 py-2 text-sm outline-none" required={!editId} />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="w-full bg-wa-input text-white rounded-lg px-3 py-2 text-sm outline-none">
                <option value="agente">Agente</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="mt-4 px-6 py-2 bg-wa-green hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
            {editId ? "Guardar Cambios" : "Crear Agente"}
          </button>
        </form>
      )}

      {loading ? <p className="text-gray-400 text-center py-12">Cargando agentes...</p> : (
        <div className="bg-wa-dark rounded-xl border border-wa-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wa-border text-gray-400 text-left">
                <th className="px-6 py-3 font-medium">Nombre</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Rol</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Ultimo turno</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agentes.map((a) => (
                <tr key={a.id} className="border-b border-wa-border/50 hover:bg-wa-header/50 transition-colors">
                  <td className="px-6 py-4 text-white">{a.nombre}</td>
                  <td className="px-6 py-4 text-gray-300">{a.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${a.rol === "admin" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                      {a.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActivo(a.id, a.activo)} className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${a.activo ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(a.ultimo_turno)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-white mr-3 text-xs transition-colors">Editar</button>
                    <button onClick={() => handleDelete(a.id, a.nombre)} className="text-gray-400 hover:text-red-400 text-xs transition-colors">Desactivar</button>
                  </td>
                </tr>
              ))}
              {agentes.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-gray-500 text-center">No hay agentes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
