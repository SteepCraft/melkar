import { useState, useEffect, type FormEvent } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  status: string
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ id: '', name: '', email: '', phone: '', address: '' })
  const [error, setError] = useState('')

  const fetchClients = async () => {
    const url = filter ? `${API}/clients?status=${filter}` : `${API}/clients`
    const data = await fetch(url).then((r) => r.json())
    setClients(data)
  }
  useEffect(() => { fetchClients() }, [filter])

  const openNew = () => { setEditing(null); setForm({ id: '', name: '', email: '', phone: '', address: '' }); setError(''); setShowModal(true) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ id: c.id, name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' }); setError(''); setShowModal(true) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (form.phone && !/^\d{7,15}$/.test(form.phone)) { setError('El teléfono debe tener entre 7 y 15 dígitos'); return }
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `${API}/clients/${editing.id}` : `${API}/clients`
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); fetchClients()
  }

  const toggleStatus = async (id: string) => { await fetch(`${API}/clients/${id}/toggle`, { method: 'PUT' }); fetchClients() }
  const deleteClient = async (id: string) => { if (!confirm('¿Eliminar este cliente permanentemente?')) return; await fetch(`${API}/clients/${id}`, { method: 'DELETE' }); fetchClients() }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="clientes" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gestión de Clientes">
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <span className="material-symbols-outlined text-lg">add</span>Nuevo Cliente
          </button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="flex gap-2 mb-4">
            {[{ k: '', l: 'Todos' }, { k: 'Activo', l: 'Activos' }, { k: 'Inactivo', l: 'Inactivos' }].map((t) => (
              <button key={t.k} onClick={() => setFilter(t.k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === t.k ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-100'}`}>{t.l}</button>
            ))}
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
              <th className="text-left px-6 py-3 font-medium text-slate-500">ID</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Nombre</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Email</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Teléfono</th>
              <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
              <th className="text-right px-6 py-3 font-medium text-slate-500">Acciones</th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">{c.id}</td>
                  <td className="px-6 py-4 font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-slate-500">{c.email}</td>
                  <td className="px-6 py-4 text-slate-500">{c.phone || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${c.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => toggleStatus(c.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title={c.status === 'Activo' ? 'Desactivar' : 'Activar'}><span className="material-symbols-outlined text-lg">{c.status === 'Activo' ? 'toggle_on' : 'toggle_off'}</span></button>
                      <button onClick={() => deleteClient(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><span className="material-symbols-outlined text-lg">delete</span></button>
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
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              {!editing && <div><label className="block text-sm text-slate-600 mb-1">ID *</label><input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" placeholder="CLT001" /></div>}
              <div><label className="block text-sm text-slate-600 mb-1">Nombre *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Correo electrónico</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Teléfono (7-15 dígitos)</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} className="w-full px-3 py-2 border rounded-lg" placeholder="3001234567" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Dirección</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
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
