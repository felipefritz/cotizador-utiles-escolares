import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      // Obtener el token de la URL
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')

      if (token) {
        await login(token)
        navigate('/')
      } else {
        navigate('/login')
      }
    }

    handleCallback()
  }, [login, navigate])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        Iniciando sesión...
      </Typography>
    </Box>
  )
}
