import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  title: string
  children?: ReactNode
}

export default function Header({ title, children }: HeaderProps) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('melkar_user')
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
      <div className="flex items-center gap-4">
        {children}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </header>
  )
}
