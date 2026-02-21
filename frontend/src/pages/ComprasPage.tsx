import { useState, useEffect, Fragment } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface LineItem { productName: string; price: number; quantity: number }
interface Purchase { id: number; supplierName: string; total: number; status: string; createdAt: string; items: LineItem[] }
interface Supplier { id: number; name: string; nit: string }
interface Product { id: number; name: string; price: number }

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const markReceived = async (id: number) => {
    const res = await fetch(`${API}/purchases/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Recibido' }),
    })
    if (res.ok) fetchAll()
  }

  const fetchAll = async () => {
    const [p, s, pr] = await Promise.all([
      fetch(`${API}/purchases`).then((r) => r.json()),
      fetch(`${API}/suppliers?status=Activo`).then((r) => r.json()),
      fetch(`${API}/products?filter=active`).then((r) => r.json()).catch(() => fetch(`${API}/products`).then((r) => r.json())),
    ])
    setPurchases(p); setSuppliers(s); setProducts(pr)
  }
  useEffect(() => { fetchAll() }, [])

  const addItem = () => setItems([...items, { productName: '', price: 0, quantity: 1 }])
  const updateItem = (idx: number, field: string, val: string | number) => {
    const copy = [...items]
    ;(copy[idx] as any)[field] = val
    if (field === 'productName') { const prod = products.find((p) => p.name === val); if (prod) copy[idx].price = prod.price }
    setItems(copy)
  }
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value; setSupplierId(id)
    const s = suppliers.find((s) => String(s.id) === String(id)); setSupplierName(s ? s.name : '')
  }

  const handleSubmit = async () => {
    setError('')
    if (!supplierId) { setError('Debe seleccionar un proveedor'); return }
    if (items.length === 0) { setError('Debe agregar al menos un producto'); return }
    for (const it of items) {
      if (!it.productName) { setError('Todos los productos deben tener nombre'); return }
      if (it.quantity <= 0) { setError(`Cantidad de '${it.productName}' debe ser mayor a 0`); return }
    }
    const res = await fetch(`${API}/purchases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId: parseInt(supplierId), supplierName, items }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowForm(false); setSupplierId(''); setSupplierName(''); setItems([]); fetchAll()
  }

  if (showForm) return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="compras" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Nueva Compra">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 border shadow-sm">
                <h3 className="font-semibold mb-4">Proveedor</h3>
                <select value={supplierId} onChange={handleSupplierChange} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} {s.nit ? `(NIT: ${s.nit})` : ''}</option>)}
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
                    <th className="text-right px-4 py-2 font-medium text-slate-500">Precio</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-500">Cantidad</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-500">Subtotal</th>
                    <th className="px-4 py-2"></th>
                  </tr></thead><tbody className="divide-y">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2"><select value={it.productName} onChange={(e) => updateItem(idx, 'productName', e.target.value)} className="w-full px-2 py-1 border rounded"><option value="">Seleccionar...</option>{products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></td>
                        <td className="px-4 py-2"><input type="number" min="0" step="0.01" value={it.price} onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 border rounded text-right" /></td>
                        <td className="px-4 py-2"><input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-20 px-2 py-1 border rounded text-right" /></td>
                        <td className="px-4 py-2 text-right font-medium">${(it.price * it.quantity).toLocaleString()}</td>
                        <td className="px-4 py-2"><button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><span className="material-symbols-outlined text-lg">delete</span></button></td>
                      </tr>
                    ))}
                  </tbody></table>
                }
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border shadow-sm h-fit sticky top-8">
              <h3 className="font-semibold mb-4">Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Proveedor</span><span className="font-medium">{supplierName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Productos</span><span className="font-medium">{items.length}</span></div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold"><span>Total</span><span>${total.toLocaleString()}</span></div>
              </div>
              <button onClick={handleSubmit} className="w-full mt-4 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Registrar Compra</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="compras" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Compras">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><span className="material-symbols-outlined text-lg">add</span>Nueva Compra</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
              <th className="text-left px-6 py-3 font-medium text-slate-500">#</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Proveedor</th>
              <th className="text-right px-6 py-3 font-medium text-slate-500">Total</th>
              <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Fecha</th>
              <th className="px-6 py-3"></th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {purchases.map((p) => (
                <Fragment key={p.id}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                    <td className="px-6 py-4 font-medium">#{p.id}</td>
                    <td className="px-6 py-4">{p.supplierName}</td>
                    <td className="px-6 py-4 text-right font-bold">${p.total?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${p.status === 'Recibido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span></td>
                    <td className="px-6 py-4 text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      {p.status === 'Pendiente' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markReceived(p.id) }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          title="Marcar como recibido"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Recibido
                        </button>
                      )}
                      <span className="material-symbols-outlined text-slate-400 cursor-pointer">{expanded === p.id ? 'expand_less' : 'expand_more'}</span>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr><td colSpan={6} className="px-6 pb-4 bg-slate-50">
                      <table className="w-full text-sm mt-2"><thead><tr>
                        <th className="text-left px-3 py-1 text-xs text-slate-500">Producto</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Precio</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Cantidad</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Subtotal</th>
                      </tr></thead><tbody>
                        {(p.items || []).map((it, i) => (
                          <tr key={i}><td className="px-3 py-1">{it.productName}</td><td className="px-3 py-1 text-right">${it.price?.toLocaleString()}</td><td className="px-3 py-1 text-right">{it.quantity}</td><td className="px-3 py-1 text-right font-medium">${(it.price * it.quantity).toLocaleString()}</td></tr>
                        ))}
                      </tbody></table>
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
