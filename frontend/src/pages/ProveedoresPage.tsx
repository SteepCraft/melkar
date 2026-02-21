import { useState, useEffect, type FormEvent } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface Supplier {
  id: number
  name: string
  nit: string
  phone: string
  location: string
  email: string
  status: string
}

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', nit: '', phone: '', location: '', email: '' })
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = async () => {
    const q = statusFilter ? `?status=${statusFilter}` : ''
    setSuppliers(await (await fetch(`${API}/suppliers${q}`)).json())
  }
  useEffect(() => { fetchData() }, [statusFilter])

  const openNew = () => { setEditItem(null); setForm({ name: '', nit: '', phone: '', location: '', email: '' }); setError(''); setShowModal(true) }
  const openEdit = (s: Supplier) => { setEditItem(s); setForm({ name: s.name, nit: s.nit || '', phone: s.phone || '', location: s.location || '', email: s.email || '' }); setError(''); setShowModal(true) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!form.name.trim()) { setError('Nombre requerido'); return }
    if (form.phone && !/^\d{7,15}$/.test(form.phone)) { setError('Teléfono inválido'); return }
    const url = editItem ? `${API}/suppliers/${editItem.id}` : `${API}/suppliers`
    const res = await fetch(url, { method: editItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); fetchData()
  }

  const handleToggle = async (id: number) => { await fetch(`${API}/suppliers/${id}/toggle`, { method: 'PUT' }); fetchData() }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="proveedores" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gestión de Proveedores">
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <span className="material-symbols-outlined text-lg">add</span>Nuevo Proveedor
          </button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="flex gap-2 mb-6">
            {['', 'Activo', 'Inactivo'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border'}`}>
                {s || 'Todos'}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Nombre</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">NIT</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Teléfono</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Ubicación</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Email</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-50 ${s.status === 'Inactivo' ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4 text-slate-500">{s.nit}</td>
                    <td className="px-6 py-4 text-slate-500">{s.phone}</td>
                    <td className="px-6 py-4 text-slate-500">{s.location}</td>
                    <td className="px-6 py-4 text-slate-500">{s.email}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggle(s.id)} className={`text-xs px-2 py-1 rounded ${s.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{s.status}</button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700"><span className="material-symbols-outlined text-lg">edit</span></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">{editItem ? 'Editar' : 'Nuevo'} Proveedor</h3>
            {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm text-slate-600 mb-1">Nombre *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">NIT</label><input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Teléfono</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Ubicación</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
