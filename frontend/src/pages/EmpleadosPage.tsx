import { useState, useEffect, type FormEvent } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { API } from '../lib/api'

interface Employee {
  id: number
  name: string
  document: string
  phone: string
  email: string
  position: string
  status: string
}

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ name: '', document: '', phone: '', email: '', position: [] as string[] })
  const [error, setError] = useState('')

  const CARGOS = ['Gerente', 'Técnico', 'Vendedor']

  const fetchEmployees = async () => {
    const url = filter ? `${API}/employees?status=${filter}` : `${API}/employees`
    setEmployees(await fetch(url).then((r) => r.json()))
  }
  useEffect(() => { fetchEmployees() }, [filter])

  const openNew = () => { setEditing(null); setForm({ name: '', document: '', phone: '', email: '', position: [] }); setError(''); setShowModal(true) }
  const openEdit = (emp: Employee) => { setEditing(emp); setForm({ name: emp.name, document: emp.document || '', phone: emp.phone || '', email: emp.email || '', position: emp.position ? emp.position.split(', ') : [] }); setError(''); setShowModal(true) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (form.phone && !/^\d{7,15}$/.test(form.phone)) { setError('El teléfono debe tener entre 7 y 15 dígitos'); return }
    if (form.position.length === 0) { setError('Debe seleccionar al menos un cargo'); return }
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `${API}/employees/${editing.id}` : `${API}/employees`
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, position: form.position.join(', ') }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowModal(false); fetchEmployees()
  }

  const toggleStatus = async (id: number) => { await fetch(`${API}/employees/${id}/toggle`, { method: 'PUT' }); fetchEmployees() }
  const deleteEmployee = async (id: number) => { if (!confirm('¿Eliminar este empleado permanentemente?')) return; await fetch(`${API}/employees/${id}`, { method: 'DELETE' }); fetchEmployees() }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage="empleados" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gestión de Empleados">
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <span className="material-symbols-outlined text-lg">add</span>Nuevo Empleado
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
              <th className="text-left px-6 py-3 font-medium text-slate-500">Nombre</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Documento</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Teléfono</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Email</th>
              <th className="text-left px-6 py-3 font-medium text-slate-500">Cargo</th>
              <th className="text-center px-6 py-3 font-medium text-slate-500">Estado</th>
              <th className="text-right px-6 py-3 font-medium text-slate-500">Acciones</th>
            </tr></thead><tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{emp.name}</td>
                  <td className="px-6 py-4 text-slate-500">{emp.document || '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{emp.phone || '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{emp.email || '—'}</td>
                  <td className="px-6 py-4">{emp.position || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${emp.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{emp.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-lg">edit</span></button>
                      <button onClick={() => toggleStatus(emp.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><span className="material-symbols-outlined text-lg">{emp.status === 'Activo' ? 'toggle_on' : 'toggle_off'}</span></button>
                      <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><span className="material-symbols-outlined text-lg">delete</span></button>
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
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
            {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm text-slate-600 mb-1">Nombre *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Documento</label><input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Cédula/NIT" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Teléfono</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm text-slate-600 mb-1">Cargo *</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CARGOS.map((cargo) => {
                    const selected = form.position.includes(cargo)
                    return (
                      <button
                        key={cargo}
                        type="button"
                        onClick={() => setForm({ ...form, position: selected ? form.position.filter((p) => p !== cargo) : [...form.position, cargo] })}
                        className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'}`}
                      >
                        {cargo}
                      </button>
                    )
                  })}
                </div>
              </div>
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
