import { useState, useEffect, type FormEvent } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface Product {
  id: number
  name: string
  sku: string
  price: number
  stock: number
  status: string
  active: number
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editProd, setEditProd] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', sku: '', price: '', stock: '' })
  const [error, setError] = useState('')

  const fetchProducts = async () => {
    const q = filter === 'all' ? '' : `?filter=${filter}`
    const r = await fetch(`${API}/products${q}`)
    setProducts(await r.json())
  }
  useEffect(() => { fetchProducts() }, [filter])

  const openNew = () => { setEditProd(null); setForm({ name: '', sku: '', price: '', stock: '' }); setError(''); setShowModal(true) }
  const openEdit = (p: Product) => { setEditProd(p); setForm({ name: p.name, sku: p.sku, price: String(p.price), stock: String(p.stock) }); setError(''); setShowModal(true) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!form.name.trim()) { setError('Nombre requerido'); return }
    if (parseFloat(form.price) < 0) { setError('El precio no puede ser negativo'); return }
    try {
      const url = editProd ? `${API}/products/${editProd.id}` : `${API}/products`
      const res = await fetch(url, {
        method: editProd ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, sku: form.sku, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowModal(false); fetchProducts()
    } catch { setError('Error de conexión') }
  }

  const handleToggle = async (id: number) => { await fetch(`${API}/products/${id}/toggle`, { method: 'PUT' }); fetchProducts() }
  const handleDelete = async (id: number) => { if (!confirm('¿Eliminar este producto?')) return; await fetch(`${API}/products/${id}`, { method: 'DELETE' }); fetchProducts() }

  const tabs = [
    { key: 'all', label: 'Todos' }, { key: 'in-stock', label: 'En Stock' },
    { key: 'low', label: 'Stock Bajo' }, { key: 'inactive', label: 'Inactivos' },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="productos" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gestión de Productos">
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
            <span className="material-symbols-outlined text-lg">add</span>Nuevo Producto
          </button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="flex gap-2 mb-6">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === t.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Nombre</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">SKU</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Precio</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Stock</th>
                  <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
                  <th className="text-center px-6 py-3 font-medium text-slate-500">Activo</th>
                  <th className="text-center px-6 py-3 font-medium text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50 ${!p.active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-slate-800">{p.name}</td>
                    <td className="px-6 py-4 text-slate-500">{p.sku}</td>
                    <td className="px-6 py-4 text-right font-medium">${p.price?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">{p.stock}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                        p.status === 'En Stock' ? 'bg-emerald-100 text-emerald-700' :
                        p.status === 'Stock Bajo' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggle(p.id)} className={`text-xs px-2 py-1 rounded ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openEdit(p)} className="text-blue-500 hover:text-blue-700 mr-2"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600"><span className="material-symbols-outlined text-lg">delete</span></button>
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
            <h3 className="text-lg font-semibold mb-4 text-slate-800">{editProd ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm text-slate-600 mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">SKU</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-slate-600 mb-1">Precio *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm text-slate-600 mb-1">Stock</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
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
