import { useState, useEffect, type FormEvent } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface Role { id: number; name: string }
interface User { id: number; name: string; email: string; role: string; status: string }

const getUser = () => { try { return JSON.parse(localStorage.getItem('melkar_user') || '{}') } catch { return {} } }

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [pwUser, setPwUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' })
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [pwError, setPwError] = useState('')

  const userRole = getUser().role || ''

  const fetchAll = async () => {
    const [u, r] = await Promise.all([
      fetch(`${API}/users${filter ? '?status=' + filter : ''}`, { headers: { 'X-User-Role': userRole } }).then((r) => r.json()),
      fetch(`${API}/roles`, { headers: { 'X-User-Role': userRole } }).then((r) => r.json()),
    ])
    setUsers(u); setRoles(r)
  }
  useEffect(() => { fetchAll() }, [filter])

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '', password: '', role: '' }); setError(''); setShowModal(true) }
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setError(''); setShowModal(true) }
  const openPw = (u: User) => { setPwUser(u); setPwForm({ newPassword: '', confirmPassword: '' }); setPwError(''); setShowPwModal(true) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!form.name || !form.role) { setError('Complete los campos requeridos'); return }
    if (!editing && !form.password) { setError('La contraseña es requerida'); return }
    const url = editing ? `${API}/users/${editing.id}` : `${API}/users`
    const method = editing ? 'PUT' : 'POST'
    const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role }
    if (form.password) body.password = form.password
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-User-Role': userRole }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); fetchAll()
  }

  const handlePwSubmit = async (e: FormEvent) => {
    e.preventDefault(); setPwError('')
    if (pwForm.newPassword.length < 4) { setPwError('Mínimo 4 caracteres'); return }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Las contraseñas no coinciden'); return }
    const res = await fetch(`${API}/users/${pwUser?.id}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Role': userRole }, body: JSON.stringify({ password: pwForm.newPassword }) })
    const data = await res.json()
    if (!res.ok) { setPwError(data.error); return }
    setShowPwModal(false)
  }

  const toggleStatus = async (u: User) => {
    await fetch(`${API}/users/${u.id}/toggle`, { method: 'PUT', headers: { 'X-User-Role': userRole } })
    fetchAll()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="usuarios" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gestión de Usuarios">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><span className="material-symbols-outlined text-lg">add</span>Nuevo Usuario</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="flex gap-2 mb-4">
            {[{ k: '', l: 'Todos' }, { k: 'activo', l: 'Activos' }, { k: 'inactivo', l: 'Inactivos' }].map((t) => (
              <button key={t.k} onClick={() => setFilter(t.k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === t.k ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-100'}`}>{t.l}</button>
            ))}
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Nombre</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Email</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Rol</th>
              <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
              <th className="text-center px-6 py-3 font-medium text-slate-500">Acciones</th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4 text-slate-500">{u.email}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{u.role}</span></td>
                  <td className="px-6 py-4 text-center"><span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${u.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span></td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1 rounded hover:bg-blue-50 text-blue-600" title="Editar"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => openPw(u)} className="p-1 rounded hover:bg-amber-50 text-amber-600" title="Cambiar contraseña"><span className="material-symbols-outlined text-lg">key</span></button>
                      <button onClick={() => toggleStatus(u)} className="p-1 rounded hover:bg-slate-100 text-slate-500" title="Cambiar estado"><span className="material-symbols-outlined text-lg">{u.status === 'Activo' ? 'toggle_on' : 'toggle_off'}</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </main>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm text-slate-600 mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">{editing ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg" {...(!editing ? { required: true } : {})} /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Rol *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Seleccionar...</option>
                  {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </div>
      )}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handlePwSubmit} className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña — {pwUser?.name}</h3>
            {pwError && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{pwError}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm text-slate-600 mb-1">Nueva Contraseña *</label>
                <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Confirmar Contraseña *</label>
                <input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowPwModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Cambiar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
