import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export type User = {
  id: number
  email: string
  name: string | null
  avatar_url: string | null
  provider: string
  is_admin: boolean
}

type AuthContextType = {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar token del localStorage al iniciar
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      login(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (newToken: string) => {
    try {
      setToken(newToken)
      localStorage.setItem('auth_token', newToken)

      // Obtener información del usuario
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Token inválido')
      }

      const userData = await response.json()
      setUser(userData)
    } catch (error) {
      console.error('Error al autenticar:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
