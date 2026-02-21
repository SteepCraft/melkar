import { useState, useEffect, type FormEvent } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'
import * as XLSX from 'xlsx'

interface Product { id: number; name: string; sku: string; price: number; stock: number; status: string }
interface Movement { id: number; productName: string; type: string; quantity: number; reason: string; date: string }

export default function InventarioPage() {
  const [stats, setStats] = useState({ totalSKUs: 0, alerts: 0, totalValue: 0 })
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState('stock')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ productName: '', type: 'ENTRADA', quantity: '', reason: '' })
  const [error, setError] = useState('')

  const fetchAll = async () => {
    const [s, p, m, ap] = await Promise.all([
      fetch(`${API}/inventory/stats`).then((r) => r.json()),
      fetch(`${API}/inventory/products${filter ? '?filter=' + filter : ''}`).then((r) => r.json()),
      fetch(`${API}/inventory/movements`).then((r) => r.json()),
      fetch(`${API}/inventory/products`).then((r) => r.json()),
    ])
    setStats(s); setProducts(p); setMovements(m); setAllProducts(ap)
  }
  useEffect(() => { fetchAll() }, [filter])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!form.productName) { setError('Seleccione un producto'); return }
    if (!form.quantity || parseInt(form.quantity) <= 0) { setError('Cantidad debe ser mayor a 0'); return }
    if (!form.reason) { setError('Debe indicar el motivo del ajuste'); return }
    const res = await fetch(`${API}/inventory/movements`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName: form.productName, type: form.type, quantity: parseInt(form.quantity), reason: form.reason }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); setForm({ productName: '', type: 'ENTRADA', quantity: '', reason: '' }); fetchAll()
  }

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(products.map((p) => ({ Nombre: p.name, SKU: p.sku, Precio: p.price, Stock: p.stock, Estado: p.status })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, 'inventario_melkar.xlsx')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="inventario" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gestión de Inventario">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><span className="material-symbols-outlined text-lg">download</span>Exportar Excel</button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><span className="material-symbols-outlined text-lg">add</span>Ajustar Inventario</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border shadow-sm"><p className="text-sm text-slate-500">SKUs Totales</p><p className="text-2xl font-bold mt-1">{stats.totalSKUs}</p></div>
            <div className="bg-white rounded-xl p-6 border shadow-sm"><p className="text-sm text-slate-500">Alertas Stock Crítico (&lt;5)</p><p className="text-2xl font-bold mt-1 text-red-500">{stats.alerts}</p></div>
            <div className="bg-white rounded-xl p-6 border shadow-sm"><p className="text-sm text-slate-500">Valor Estimado</p><p className="text-2xl font-bold mt-1">${stats.totalValue?.toLocaleString()}</p></div>
          </div>
          <div className="flex gap-2 mb-4">
            {[{ k: '', l: 'Todos' }, { k: 'critical', l: 'Crítico (<5)' }, { k: 'low', l: 'Bajo (5-10)' }].map((t) => (
              <button key={t.k} onClick={() => { setFilter(t.k); setTab('stock') }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === t.k && tab === 'stock' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-100'}`}>{t.l}</button>
            ))}
            <button onClick={() => setTab('movements')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'movements' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-100'}`}>Movimientos</button>
          </div>
          {tab === 'stock' ? (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Producto</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">SKU</th>
                <th className="text-right px-6 py-3 font-medium text-slate-500">Precio</th>
                <th className="text-right px-6 py-3 font-medium text-slate-500">Stock</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
              </tr></thead><tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50 ${p.stock < 5 ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-slate-500">{p.sku}</td>
                    <td className="px-6 py-4 text-right">${p.price?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold">{p.stock}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${p.stock < 5 ? 'bg-red-100 text-red-700' : p.stock <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Producto</th>
                <th className="text-center px-6 py-3 font-medium text-slate-500">Tipo</th>
                <th className="text-right px-6 py-3 font-medium text-slate-500">Cantidad</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Motivo</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Fecha</th>
              </tr></thead><tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{m.productName}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${m.type === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{m.type}</span></td>
                    <td className="px-6 py-4 text-right font-bold">{m.quantity}</td>
                    <td className="px-6 py-4 text-slate-500">{m.reason}</td>
                    <td className="px-6 py-4 text-slate-500">{m.date}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      </main>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Ajuste Manual de Inventario</h3>
            {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm text-slate-600 mb-1">Producto *</label>
                <select value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">Seleccionar...</option>
                  {allProducts.map((p) => <option key={p.id} value={p.name}>{p.name} (Stock: {p.stock})</option>)}
                </select></div>
              <div><label className="block text-sm text-slate-600 mb-1">Tipo *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="ENTRADA">ENTRADA</option><option value="SALIDA">SALIDA</option>
                </select></div>
              <div><label className="block text-sm text-slate-600 mb-1">Cantidad *</label>
                <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Motivo del ajuste *</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" rows={2}></textarea></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Registrar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
