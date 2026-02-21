import { useState, useEffect, Fragment } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface LineItem { productName: string; price: number; quantity: number }
interface Sale { id: number; clientName: string; employeeName: string; total: number; subtotal: number; tax: number; transport: number; status: string; createdAt: string; items: LineItem[] }
interface Client { id: string; name: string }
interface Product { id: number; name: string; price: number; stock: number; active: number }

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [transport, setTransport] = useState(0)
  const [items, setItems] = useState<LineItem[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const currentUser = JSON.parse(localStorage.getItem('melkar_user') || '{}')

  const fetchAll = async () => {
    const [s, c, p] = await Promise.all([
      fetch(`${API}/sales`).then((r) => r.json()),
      fetch(`${API}/clients?status=Activo`).then((r) => r.json()),
      fetch(`${API}/products`).then((r) => r.json()),
    ])
    setSales(s); setClients(c); setProducts(p.filter((x: Product) => x.active !== 0 && x.stock > 0))
  }
  useEffect(() => { fetchAll() }, [])

  const addItem = () => setItems([...items, { productName: '', price: 0, quantity: 1 }])
  const updateItem = (idx: number, field: string, val: string | number) => {
    const copy = [...items]; (copy[idx] as any)[field] = val
    if (field === 'productName') { const pr = products.find((p) => p.name === val); if (pr) copy[idx].price = pr.price }
    setItems(copy)
  }
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * 0.19 * 100) / 100
  const total = Math.round((subtotal + tax + transport) * 100) / 100

  const clientChange = (e: React.ChangeEvent<HTMLSelectElement>) => { const id = e.target.value; setClientId(id); const c = clients.find((c) => c.id === id); setClientName(c ? c.name : '') }

  const handleSubmit = async () => {
    setError('')
    if (!clientId) { setError('Debe seleccionar un cliente'); return }
    if (items.length === 0) { setError('Debe agregar al menos un producto'); return }
    for (const it of items) {
      if (!it.productName) { setError('Todos los productos deben tener nombre'); return }
      if (it.quantity <= 0) { setError(`Cantidad de '${it.productName}' debe ser mayor a 0`); return }
      const prod = products.find((p) => p.name === it.productName)
      if (prod && it.quantity > prod.stock) { setError(`Stock insuficiente para '${it.productName}'. Disponible: ${prod.stock}`); return }
    }
    const res = await fetch(`${API}/sales`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientName, employeeName: currentUser.name || '', transport, items }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowForm(false); setClientId(''); setClientName(''); setTransport(0); setItems([]); fetchAll()
  }

  if (showForm) return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="ventas" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Nueva Venta">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 border shadow-sm">
                <h3 className="font-semibold mb-4">Cliente</h3>
                <select value={clientId} onChange={clientChange} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl p-6 border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Productos</h3>
                  <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><span className="material-symbols-outlined text-lg">add</span>Agregar</button>
                </div>
                {items.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">No hay productos agregados</p> :
                  <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-500">Producto</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-500">Stock</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-500">Precio</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-500">Cantidad</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-500">Subtotal</th>
                    <th className="px-4 py-2"></th>
                  </tr></thead><tbody className="divide-y">
                    {items.map((it, idx) => {
                      const prod = products.find((p) => p.name === it.productName)
                      const stockAvail = prod ? prod.stock : 0
                      return (
                        <tr key={idx} className={it.quantity > stockAvail && it.productName ? 'bg-red-50' : ''}>
                          <td className="px-4 py-2"><select value={it.productName} onChange={(e) => updateItem(idx, 'productName', e.target.value)} className="w-full px-2 py-1 border rounded"><option value="">Seleccionar...</option>{products.map((p) => <option key={p.id} value={p.name}>{p.name} ({p.stock} disp.)</option>)}</select></td>
                          <td className="px-4 py-2 text-right text-sm text-slate-500">{stockAvail}</td>
                          <td className="px-4 py-2"><input type="number" min="0" step="0.01" value={it.price} onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 border rounded text-right" /></td>
                          <td className="px-4 py-2"><input type="number" min="1" max={stockAvail} value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-20 px-2 py-1 border rounded text-right" /></td>
                          <td className="px-4 py-2 text-right font-medium">${(it.price * it.quantity).toLocaleString()}</td>
                          <td className="px-4 py-2"><button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><span className="material-symbols-outlined text-lg">delete</span></button></td>
                        </tr>
                      )
                    })}
                  </tbody></table>
                }
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border shadow-sm h-fit sticky top-8">
              <h3 className="font-semibold mb-4">Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium">{clientName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Vendedor</span><span className="font-medium">{currentUser.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Productos</span><span className="font-medium">{items.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">${subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">IVA (19%)</span><span className="font-medium">${tax.toLocaleString()}</span></div>
                <div><label className="block text-slate-500 mb-1">Transporte</label><input type="number" min="0" step="100" value={transport} onChange={(e) => setTransport(parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-right text-sm" /></div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold"><span>Total</span><span>${total.toLocaleString()}</span></div>
              </div>
              <button onClick={handleSubmit} className="w-full mt-4 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Registrar Venta</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="ventas" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Ventas">
          <button onClick={() => { setShowForm(true); setError('') }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"><span className="material-symbols-outlined text-lg">add</span>Nueva Venta</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
              <th className="text-left px-6 py-3 font-medium text-slate-500">#</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Cliente</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Vendedor</th>
              <th className="text-right px-6 py-3 font-medium text-slate-500">Total</th>
              <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Fecha</th>
              <th className="px-6 py-3"></th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {sales.map((s) => (
                <Fragment key={s.id}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                    <td className="px-6 py-4 font-medium">#{s.id}</td>
                    <td className="px-6 py-4">{s.clientName}</td>
                    <td className="px-6 py-4 text-slate-500">{s.employeeName}</td>
                    <td className="px-6 py-4 text-right font-bold">${s.total?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center"><span className="inline-flex px-2 py-1 text-xs rounded-full font-medium bg-emerald-100 text-emerald-700">{s.status}</span></td>
                    <td className="px-6 py-4 text-slate-500">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}</td>
                    <td className="px-6 py-4"><span className="material-symbols-outlined text-slate-400">{expanded === s.id ? 'expand_less' : 'expand_more'}</span></td>
                  </tr>
                  {expanded === s.id && (
                    <tr><td colSpan={7} className="px-6 pb-4 bg-slate-50">
                      <table className="w-full text-sm mt-2"><thead><tr>
                        <th className="text-left px-3 py-1 text-xs text-slate-500">Producto</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Precio</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Cant.</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Subtotal</th>
                      </tr></thead><tbody>
                        {(s.items || []).map((it, i) => (
                          <tr key={i}><td className="px-3 py-1">{it.productName}</td><td className="px-3 py-1 text-right">${it.price?.toLocaleString()}</td><td className="px-3 py-1 text-right">{it.quantity}</td><td className="px-3 py-1 text-right font-medium">${(it.price * it.quantity).toLocaleString()}</td></tr>
                        ))}
                      </tbody></table>
                      <div className="text-right mt-2 text-sm space-y-1">
                        <div className="text-slate-500">Subtotal: ${s.subtotal?.toLocaleString()} | IVA: ${s.tax?.toLocaleString()} | Transporte: ${(s.transport || 0).toLocaleString()}</div>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody></table>
          </div>
        </div>
      </main>
    </div>
  )
}
