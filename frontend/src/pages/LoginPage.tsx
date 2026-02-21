import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Snowflake, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { API } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@melkar.com')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('') // Ensure this state is used
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotErr, setForgotErr] = useState('')
  const [tempPwd, setTempPwd] = useState('')

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error')
        setLoading(false)
        return
      }
      localStorage.setItem('melkar_user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch {
      setError('Error de conexión con el servidor')
    }
    setLoading(false)
  }

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault()
    setForgotErr('')
    setForgotMsg('')
    setTempPwd('')
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setForgotErr(data.error)
        return
      }
      setForgotMsg(data.message)
      setTempPwd(data.tempPassword)
    } catch {
      setForgotErr('Error de conexión')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="bg-primary/10 p-3 rounded-full">
            <Snowflake className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Melkar</h1>
          <p className="text-muted-foreground">
            Sistema de Gestión - Refrigeración
          </p>
        </div>

        {!showForgot ? (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
              <CardDescription className="text-center">
                Ingresa tus credenciales para acceder al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal text-xs"
                      onClick={() => setShowForgot(true)}
                      type="button"
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ingresar
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-center text-sm text-muted-foreground justify-center">
              &copy; {new Date().getFullYear()} Melkar Refrigeración
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Recuperar Contraseña</CardTitle>
              <CardDescription className="text-center">
                Te enviaremos una contraseña temporal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgot} className="space-y-4">
                {forgotErr && (
                  <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
                    {forgotErr}
                  </div>
                )}
                {forgotMsg && (
                  <div className="p-3 rounded-md bg-green-500/15 text-green-600 text-sm font-medium">
                    {forgotMsg}
                    {tempPwd && (
                      <div className="mt-2 text-xs bg-background p-2 rounded border border-green-200">
                        {/* Display temp password for demo/dev purposes if returned */}
                        Tu nueva contraseña temporal es: <span className="font-mono font-bold">{tempPwd}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Correo electrónico</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Button className="w-full" type="submit">
                    Enviar Instrucciones
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setShowForgot(false)
                      setForgotMsg('')
                      setForgotErr('')
                    }}
                    type="button"
                  >
                    Volver al inicio de sesión
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
