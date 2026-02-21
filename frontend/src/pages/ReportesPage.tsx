import { useState, type FormEvent } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'
import * as XLSX from 'xlsx'

interface SaleRow { id: number; date: string; clientName: string; total: number; items: number }
interface Summary { count: number; total: number; average: number }

export default function ReportesPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sales, setSales] = useState<SaleRow[]>([])
  const [summary, setSummary] = useState<Summary>({ count: 0, total: 0, average: 0 })
  const [loaded, setLoaded] = useState(false)

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`${API}/reports/sales?${params}`)
    const data = await res.json()
    setSales(data.sales || [])
    setSummary(data.summary || { count: 0, total: 0, average: 0 })
    setLoaded(true)
  }

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sales.map((s) => ({ Fecha: s.date, Cliente: s.clientName, Items: s.items, Total: s.total })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Reporte Ventas')
    XLSX.writeFile(wb, 'reporte_ventas_melkar.xlsx')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="reportes" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Reportes">
          {loaded && sales.length > 0 && (
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><span className="material-symbols-outlined text-lg">download</span>Exportar Excel</button>
          )}
        </Header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <form onSubmit={handleSearch} className="bg-white rounded-xl border shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Reporte de Ventas</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1"><label className="block text-sm text-slate-600 mb-1">Desde</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="flex-1"><label className="block text-sm text-slate-600 mb-1">Hasta</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Generar Reporte</button>
            </div>
          </form>
          {loaded && (
            <>
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border shadow-sm"><p className="text-sm text-slate-500">Total Ventas</p><p className="text-2xl font-bold mt-1">{summary.count}</p></div>
                <div className="bg-white rounded-xl p-6 border shadow-sm"><p className="text-sm text-slate-500">Monto Total</p><p className="text-2xl font-bold mt-1">${summary.total?.toLocaleString()}</p></div>
                <div className="bg-white rounded-xl p-6 border shadow-sm"><p className="text-sm text-slate-500">Promedio por Venta</p><p className="text-2xl font-bold mt-1">${summary.average?.toLocaleString()}</p></div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm"><thead className="bg-slate-50"><tr>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Fecha</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Cliente</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Ítems</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Total</th>
                </tr></thead><tbody className="divide-y divide-slate-100">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">{s.date}</td>
                      <td className="px-6 py-4 font-medium">{s.clientName}</td>
                      <td className="px-6 py-4 text-right">{s.items}</td>
                      <td className="px-6 py-4 text-right font-bold">${s.total?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No hay ventas en el rango seleccionado</td></tr>}
                </tbody></table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
