import { useState, useEffect, type FormEvent } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface Permission { module: string; label: string }
interface Role { id: number; name: string; description: string; permissions: string[]; isSystem: boolean }

const MODULES: Permission[] = [
  { module: 'dashboard', label: 'Dashboard' },
  { module: 'productos', label: 'Productos' },
  { module: 'proveedores', label: 'Proveedores' },
  { module: 'inventario', label: 'Inventario' },
  { module: 'compras', label: 'Compras' },
  { module: 'clientes', label: 'Clientes' },
  { module: 'cotizaciones', label: 'Cotizaciones' },
  { module: 'ventas', label: 'Ventas' },
  { module: 'reportes', label: 'Reportes' },
  { module: 'empleados', label: 'Empleados' },
  { module: 'roles', label: 'Roles' },
  { module: 'usuarios', label: 'Usuarios' },
]

const getUser = () => { try { return JSON.parse(localStorage.getItem('melkar_user') || '{}') } catch { return {} } }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] })
  const [error, setError] = useState('')

  const userRole = getUser().roleName || ''

  const fetchRoles = async () => {
    const res = await fetch(`${API}/roles`, { headers: { 'X-User-Role': userRole } })
    const data = await res.json()
    setRoles(data)
  }
  useEffect(() => { fetchRoles() }, [])

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', permissions: [] }); setError(''); setShowModal(true) }
  const openEdit = (r: Role) => { setEditing(r); setForm({ name: r.name, description: r.description, permissions: [...r.permissions] }); setError(''); setShowModal(true) }

  const togglePerm = (mod: string) => {
    setForm((f) => ({ ...f, permissions: f.permissions.includes(mod) ? f.permissions.filter((p) => p !== mod) : [...f.permissions, mod] }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!form.name) { setError('El nombre es requerido'); return }
    const url = editing ? `${API}/roles/${editing.id}` : `${API}/roles`
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-User-Role': userRole }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); fetchRoles()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este rol?')) return
    await fetch(`${API}/roles/${id}`, { method: 'DELETE', headers: { 'X-User-Role': userRole } })
    fetchRoles()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="roles" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gestión de Roles">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><span className="material-symbols-outlined text-lg">add</span>Nuevo Rol</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {roles.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{r.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{r.description}</p>
                  </div>
                  {r.isSystem && <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-full font-medium">Sistema</span>}
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {r.permissions.map((p) => (
                    <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{p}</span>
                  ))}
                </div>
                {!r.isSystem && (
                  <div className="flex gap-2 pt-3 border-t">
                    <button onClick={() => openEdit(r)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"><span className="material-symbols-outlined text-lg">edit</span>Editar</button>
                    <button onClick={() => handleDelete(r.id)} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"><span className="material-symbols-outlined text-lg">delete</span>Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Editar Rol' : 'Nuevo Rol'}</h3>
            {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm text-slate-600 mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={2}></textarea></div>
              <div><label className="block text-sm text-slate-600 mb-2">Permisos</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODULES.map((m) => (
                    <label key={m.module} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={form.permissions.includes(m.module)} onChange={() => togglePerm(m.module)} className="rounded" />
                      <span className="text-sm">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
