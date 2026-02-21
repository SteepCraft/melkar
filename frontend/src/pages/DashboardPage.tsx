import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface Stats {
  totalSales: number
  totalStock: number
  activeQuotes: number
  activePurchases: number
}

interface Alert {
  id: number
  name: string
  stock: number
  status: string
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('melkar_user') || '{}')
    if (!u.id) {
      navigate('/login')
      return
    }
    fetch(`${API}/dashboard/stats`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats)
        setAlerts(d.lowStockAlerts || [])
      })
      .catch(console.error)
  }, [navigate])

  const handleRestock = async (id: number) => {
    await fetch(`${API}/products/${id}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 20 }),
    })
    const r = await fetch(`${API}/dashboard/stats`)
    const d = await r.json()
    setStats(d.stats)
    setAlerts(d.lowStockAlerts || [])
  }

  const cards = stats
    ? [
        { label: 'Ventas Totales', value: `$${(stats.totalSales || 0).toLocaleString()}`, icon: 'payments', color: 'emerald' },
        { label: 'Stock Total', value: stats.totalStock, icon: 'inventory', color: 'blue' },
        { label: 'Cotizaciones', value: stats.activeQuotes, icon: 'request_quote', color: 'amber' },
        { label: 'Compras Pend.', value: stats.activePurchases, icon: 'shopping_cart', color: 'purple' },
      ]
    : []

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="dashboard" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Tablero Principal" />
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className={`material-symbols-outlined text-2xl text-${c.color}-500`}>{c.icon}</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                <p className="text-sm text-slate-500 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
          {alerts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">warning</span>
                <h3 className="font-semibold text-slate-800">Alertas de Stock Bajo</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {alerts.map((a) => (
                  <div key={a.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{a.name}</p>
                      <p className="text-sm text-slate-500">
                        Stock: {a.stock} —{' '}
                        <span className={a.status === 'Crítico' ? 'text-red-500' : 'text-amber-500'}>
                          {a.status}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestock(a.id)}
                      className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                    >
                      Reponer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
