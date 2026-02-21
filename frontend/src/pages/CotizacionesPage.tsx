import { useState, useEffect, Fragment } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LineItem { productName: string; price: number; quantity: number }
interface Quote { id: number; clientId: string; clientName: string; subtotal: number; tax: number; total: number; transport: number; status: string; validityDays: number; createdAt: string; items: LineItem[] }
interface Client { id: string; name: string }
interface Product { id: number; name: string; price: number; active: number }

export default function CotizacionesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Quote | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [transport, setTransport] = useState(0)
  const [validityDays, setValidityDays] = useState(30)
  const [items, setItems] = useState<LineItem[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetchAll = async () => {
    const [q, c, p] = await Promise.all([
      fetch(`${API}/quotes`).then((r) => r.json()),
      fetch(`${API}/clients?status=Activo`).then((r) => r.json()),
      fetch(`${API}/products`).then((r) => r.json()),
    ])
    setQuotes(q); setClients(c); setProducts(p.filter((x: Product) => x.active !== 0))
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

  const openNew = () => { setEditing(null); setClientId(''); setClientName(''); setTransport(0); setValidityDays(30); setItems([]); setError(''); setShowForm(true) }
  const openEdit = (q: Quote) => {
    setEditing(q); setClientId(q.clientId); setClientName(q.clientName); setTransport(q.transport || 0); setValidityDays(q.validityDays || 30)
    setItems((q.items || []).map((i) => ({ productName: i.productName, price: i.price, quantity: i.quantity }))); setError(''); setShowForm(true)
  }

  const handleSubmit = async () => {
    setError('')
    if (!clientId) { setError('Debe seleccionar un cliente'); return }
    if (items.length === 0) { setError('Debe agregar al menos un producto'); return }
    for (const it of items) { if (!it.productName) { setError('Todos los productos deben tener nombre'); return } }
    const body = { clientId, clientName, transport, validityDays, items }
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `${API}/quotes/${editing.id}` : `${API}/quotes`
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowForm(false); fetchAll()
  }

  const sendQuote = async (id: number) => { await fetch(`${API}/quotes/${id}/send`, { method: 'POST' }); fetchAll() }

  const exportPDF = (q: Quote) => {
    const doc = new jsPDF()
    doc.setFontSize(18); doc.text('MELKAR Refrigeración', 14, 22)
    doc.setFontSize(10); doc.setTextColor(100); doc.text('NIT: 900.xxx.xxx-x | Tel: (601) xxx xxxx', 14, 28)
    doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5); doc.line(14, 32, 196, 32)
    doc.setFontSize(14); doc.setTextColor(0); doc.text(`Cotización #${q.id}`, 14, 42)
    doc.setFontSize(10)
    doc.text(`Cliente: ${q.clientName}`, 14, 50)
    doc.text(`Fecha: ${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'N/A'}`, 14, 56)
    doc.text(`Vigencia: ${q.validityDays || 30} días`, 14, 62)
    doc.text(`Estado: ${q.status}`, 140, 50)
    const tableItems = (q.items || []).map((i, idx) => [idx + 1, i.productName, i.quantity, `$${i.price.toLocaleString()}`, `$${(i.price * i.quantity).toLocaleString()}`])
    autoTable(doc, {
      startY: 68, head: [['#', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: tableItems, theme: 'striped', headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    })
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text('Subtotal:', 140, finalY); doc.text(`$${q.subtotal.toLocaleString()}`, 180, finalY, { align: 'right' })
    doc.text('IVA (19%):', 140, finalY + 6); doc.text(`$${q.tax.toLocaleString()}`, 180, finalY + 6, { align: 'right' })
    doc.text('Transporte:', 140, finalY + 12); doc.text(`$${(q.transport || 0).toLocaleString()}`, 180, finalY + 12, { align: 'right' })
    doc.setFontSize(12); doc.setFont(undefined as any, 'bold')
    doc.text('TOTAL:', 140, finalY + 20); doc.text(`$${q.total.toLocaleString()}`, 180, finalY + 20, { align: 'right' })
    doc.setFontSize(8); doc.setFont(undefined as any, 'normal'); doc.setTextColor(150)
    doc.text('Cotización generada por Melkar ERP - Sujeta a disponibilidad de inventario', 14, 280)
    doc.save(`cotizacion_${q.id}.pdf`)
  }

  if (showForm) return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="cotizaciones" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title={editing ? `Editar Cotización #${editing.id}` : 'Nueva Cotización'}>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 border shadow-sm">
                <h3 className="font-semibold mb-4">Datos Generales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-slate-600 mb-1">Cliente *</label>
                    <select value={clientId} onChange={clientChange} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Seleccionar cliente...</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                    </select></div>
                  <div><label className="block text-sm text-slate-600 mb-1">Vigencia (días)</label>
                    <input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)} className="w-full px-3 py-2 border rounded-lg" /></div>
                </div>
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
                <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium">{clientName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Productos</span><span className="font-medium">{items.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">${subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">IVA (19%)</span><span className="font-medium">${tax.toLocaleString()}</span></div>
                <div><label className="block text-slate-500 mb-1">Transporte</label><input type="number" min="0" step="100" value={transport} onChange={(e) => setTransport(parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-right text-sm" /></div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold"><span>Total</span><span>${total.toLocaleString()}</span></div>
                <div className="text-xs text-slate-400">Vigencia: {validityDays} días</div>
              </div>
              <button onClick={handleSubmit} className="w-full mt-4 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">{editing ? 'Actualizar' : 'Crear Cotización'}</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="cotizaciones" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Cotizaciones">
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><span className="material-symbols-outlined text-lg">add</span>Nueva Cotización</button>
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
              <th className="text-left px-6 py-3 font-medium text-slate-500">#</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Cliente</th>
              <th className="text-right px-6 py-3 font-medium text-slate-500">Subtotal</th>
              <th className="text-right px-6 py-3 font-medium text-slate-500">IVA</th>
              <th className="text-right px-6 py-3 font-medium text-slate-500">Total</th>
              <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Vigencia</th>
              <th className="text-right px-6 py-3 font-medium text-slate-500">Acciones</th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <Fragment key={q.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">#{q.id}</td>
                    <td className="px-6 py-4">{q.clientName}</td>
                    <td className="px-6 py-4 text-right">${q.subtotal?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-500">${q.tax?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold">${q.total?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${q.status === 'Enviada' ? 'bg-emerald-100 text-emerald-700' : q.status === 'Borrador' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{q.status}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-500">{q.validityDays} días</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setExpanded(expanded === q.id ? null : q.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Detalle"><span className="material-symbols-outlined text-lg">{expanded === q.id ? 'expand_less' : 'expand_more'}</span></button>
                        {q.status === 'Borrador' && <button onClick={() => openEdit(q)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><span className="material-symbols-outlined text-lg">edit</span></button>}
                        {q.status === 'Borrador' && <button onClick={() => sendQuote(q.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Enviar"><span className="material-symbols-outlined text-lg">send</span></button>}
                        <button onClick={() => exportPDF(q)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Exportar PDF"><span className="material-symbols-outlined text-lg">picture_as_pdf</span></button>
                      </div>
                    </td>
                  </tr>
                  {expanded === q.id && (
                    <tr><td colSpan={8} className="px-6 pb-4 bg-slate-50">
                      <table className="w-full text-sm mt-2"><thead><tr>
                        <th className="text-left px-3 py-1 text-xs text-slate-500">Producto</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Precio</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Cant.</th>
                        <th className="text-right px-3 py-1 text-xs text-slate-500">Subtotal</th>
                      </tr></thead><tbody>
                        {(q.items || []).map((it, i) => (
                          <tr key={i}><td className="px-3 py-1">{it.productName}</td><td className="px-3 py-1 text-right">${it.price?.toLocaleString()}</td><td className="px-3 py-1 text-right">{it.quantity}</td><td className="px-3 py-1 text-right font-medium">${(it.price * it.quantity).toLocaleString()}</td></tr>
                        ))}
                      </tbody></table>
                      <div className="text-right mt-2 text-sm space-y-1">
                        <div className="text-slate-500">Transporte: ${(q.transport || 0).toLocaleString()}</div>
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
