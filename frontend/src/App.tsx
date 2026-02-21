import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductosPage from './pages/ProductosPage'
import ProveedoresPage from './pages/ProveedoresPage'
import InventarioPage from './pages/InventarioPage'
import ComprasPage from './pages/ComprasPage'
import ClientesPage from './pages/ClientesPage'
import CotizacionesPage from './pages/CotizacionesPage'
import VentasPage from './pages/VentasPage'
import ReportesPage from './pages/ReportesPage'
import EmpleadosPage from './pages/EmpleadosPage'
import RolesPage from './pages/RolesPage'
import UsuariosPage from './pages/UsuariosPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/productos" element={<ProductosPage />} />
      <Route path="/proveedores" element={<ProveedoresPage />} />
      <Route path="/inventario" element={<InventarioPage />} />
      <Route path="/compras" element={<ComprasPage />} />
      <Route path="/clientes" element={<ClientesPage />} />
      <Route path="/cotizaciones" element={<CotizacionesPage />} />
      <Route path="/ventas" element={<VentasPage />} />
      <Route path="/reportes" element={<ReportesPage />} />
      <Route path="/empleados" element={<EmpleadosPage />} />
      <Route path="/roles" element={<RolesPage />} />
      <Route path="/usuarios" element={<UsuariosPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
