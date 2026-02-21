import React from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
  ShoppingCart,
  Users,
  FileText,
  BadgeDollarSign,
  BarChart3,
  Contact,
  ShieldCheck,
  UserCog,
  Snowflake,
} from 'lucide-react'
import { cn } from '../lib/utils'

interface NavItem {
  page: string
  to: string
  icon: React.ElementType
  label: string
}

const allNavItems: NavItem[] = [
  { page: 'dashboard', to: '/dashboard', icon: LayoutDashboard, label: 'Tablero' },
  { page: 'productos', to: '/productos', icon: Package, label: 'Productos' },
  { page: 'proveedores', to: '/proveedores', icon: Truck, label: 'Proveedores' },
  { page: 'inventario', to: '/inventario', icon: Warehouse, label: 'Inventario' },
  { page: 'compras', to: '/compras', icon: ShoppingCart, label: 'Compras' },
  { page: 'clientes', to: '/clientes', icon: Users, label: 'Clientes' },
  { page: 'cotizaciones', to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { page: 'ventas', to: '/ventas', icon: BadgeDollarSign, label: 'Ventas' },
  { page: 'reportes', to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { page: 'empleados', to: '/empleados', icon: Contact, label: 'Empleados' },
  { page: 'roles', to: '/roles', icon: ShieldCheck, label: 'Roles' },
  { page: 'usuarios', to: '/usuarios', icon: UserCog, label: 'Usuarios' },
]

interface SidebarProps {
  currentPage: string
}

export default function Sidebar({ currentPage }: SidebarProps) {
  const currentUser = JSON.parse(localStorage.getItem('melkar_user') || '{}')
  const perms: string[] = currentUser.permissions || []
  
  // If user has no permissions (e.g. login failed but routed here), default to empty or dashboard only
  const visibleItems = allNavItems.filter(
    (item) => item.page === 'dashboard' || perms.includes(item.page),
  )

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="rounded-full bg-primary/10 p-1">
            <Snowflake className="h-6 w-6 text-primary" />
          </div>
          <span className="text-lg">Melkar</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium space-y-1">
          {visibleItems.map((item) => {
            const active = currentPage === item.page
            return (
              <Link
                key={item.page}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  active
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 shadow-sm border">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs ring-2 ring-background">
            {(currentUser.name || 'U')[0]?.toUpperCase()}
          </div>
          <div className="grid gap-0.5 text-xs">
            <span className="font-medium">{currentUser.name || 'Usuario'}</span>
            <span className="text-muted-foreground truncate max-w-[120px]">
              {currentUser.role || 'Rol'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
