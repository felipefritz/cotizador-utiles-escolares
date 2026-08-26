import { Box, Container, Paper, Typography, Button, Stack, Divider, TextField, Alert } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: 'Google no está configurado en el servidor. Contacta al administrador.',
  google_access_denied: 'Cancelaste el acceso con Google.',
  google_invalid_state: 'La sesión de Google expiró o no es válida. Intenta nuevamente.',
  google_auth_failed: 'No pudimos autenticarte con Google. Intenta nuevamente.',
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [tab, setTab] = useState<'oauth' | 'login' | 'register'>('oauth')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) {
      setError(GOOGLE_ERRORS[oauthError] || 'No pudimos completar la autenticación.')
    }
  }, [searchParams])

  // El backend genera la URL para que Client ID y redirect_uri siempre coincidan.
  const handleGoogleAuth = (intent: 'login' | 'register') => {
    setError('')
    window.location.assign(`${API_BASE}/auth/google?intent=${intent}`)
  }

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al iniciar sesión')
      }

      const data = await response.json()
      await login(data.token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al registrarse')
      }

      const data = await response.json()
      await login(data.token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="h4" fontWeight={700} gutterBottom color="primary">
            Cotizador de Productos
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Inicia sesión para guardar cotizaciones, comparar más fuentes y gestionar tus compras recurrentes
          </Typography>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

          {tab === 'oauth' && (
            <>
              <Stack spacing={2} sx={{ width: '100%', maxWidth: 360 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<GoogleIcon />}
                  onClick={() => handleGoogleAuth('login')}
                  sx={{
                    bgcolor: '#4285F4',
                    '&:hover': { bgcolor: '#357ae8' },
                    py: 1.5,
                  }}
                >
                  Continuar con Google
                </Button>
              </Stack>

              <Divider sx={{ width: '100%', my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  o
                </Typography>
              </Divider>

              <Stack spacing={2} sx={{ width: '100%' }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setTab('login')}
                >
                  Iniciar sesión con usuario/contraseña
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  onClick={() => setTab('register')}
                >
                  ¿No tienes cuenta? Regístrate
                </Button>
              </Stack>
            </>
          )}

          {tab === 'login' && (
            <>
              <form onSubmit={handleLocalLogin} style={{ width: '100%' }}>
                <Stack spacing={2}>
                  <TextField
                    label="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </Button>
                  <Button
                    variant="text"
                    fullWidth
                    onClick={() => setTab('oauth')}
                  >
                    Volver a opciones de inicio de sesión
                  </Button>
                </Stack>
              </form>
            </>
          )}

          {tab === 'register' && (
            <>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<GoogleIcon />}
                onClick={() => handleGoogleAuth('register')}
                sx={{
                  bgcolor: '#4285F4',
                  '&:hover': { bgcolor: '#357ae8' },
                  py: 1.5,
                }}
              >
                Registrarse con Google
              </Button>

              <Divider sx={{ width: '100%', my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  o regístrate con email
                </Typography>
              </Divider>

              <form onSubmit={handleRegister} style={{ width: '100%' }}>
                <Stack spacing={2}>
                  <TextField
                    label="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    required
                    helperText="3-20 caracteres"
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    helperText="Mínimo 8 caracteres"
                  />
                  <TextField
                    label="Confirmar contraseña"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    required
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Registrándose...' : 'Registrarse'}
                  </Button>
                  <Button
                    variant="text"
                    fullWidth
                    onClick={() => setTab('login')}
                  >
                    ¿Ya tienes cuenta? Inicia sesión
                  </Button>
                </Stack>
              </form>
            </>
          )}

          <Divider sx={{ width: '100%', my: 2 }} />
          <Typography variant="caption" color="text.secondary" align="center">
            Al iniciar sesión, aceptas nuestros términos de servicio y política de privacidad
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
