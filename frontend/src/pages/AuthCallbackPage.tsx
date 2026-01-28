import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Obtener parámetros de la URL
        const token = searchParams.get('token')
        const errorParam = searchParams.get('error')

        console.log('AuthCallback - token:', !!token, 'error:', errorParam)

        if (errorParam) {
          setError('Error en la autenticación con Google. Por favor intenta de nuevo.')
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        if (token) {
          console.log('Token recibido, iniciando sesión...')
          await login(token)
          console.log('Sesión iniciada, redirigiendo...')
          navigate('/')
        } else {
          setError('No se recibió token de autenticación')
          setTimeout(() => navigate('/login'), 2000)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        console.error('Error en callback:', message, err)
        setError(message)
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, login, navigate])

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 400, mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Redirigiendo a login...
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress sx={{ mb: 2 }} />
      <Typography color="text.secondary">
        Procesando autenticación...
      </Typography>
    </Box>
  )
}
