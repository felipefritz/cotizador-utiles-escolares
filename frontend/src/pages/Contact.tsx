import { useState } from 'react'
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { api } from '../api'

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await api.post('/contact', formData)
      
      setSuccess(true)
      setFormData({ name: '', email: '', message: '' })
      
      // Limpiar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error enviando el mensaje. Intenta de nuevo.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = formData.name.trim() && formData.email.trim() && formData.message.trim()

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={0} sx={{ p: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Contacto
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          ¿Tienes dudas o sugerencias? Nos encantaría escucharte.
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            ✓ Mensaje enviado exitosamente. Nos pondremos en contacto pronto.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Tu nombre"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            fullWidth
            required
            variant="outlined"
            placeholder="Juan Pérez"
          />

          <TextField
            label="Tu correo"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            fullWidth
            required
            variant="outlined"
            placeholder="juan@example.com"
          />

          <TextField
            label="Mensaje"
            name="message"
            value={formData.message}
            onChange={handleChange}
            disabled={loading}
            fullWidth
            required
            multiline
            rows={5}
            variant="outlined"
            placeholder="Cuéntanos qué piensas..."
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!isFormValid || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ mt: 2 }}
          >
            {loading ? 'Enviando...' : 'Enviar mensaje'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
          Responderemos a tu correo lo antes posible.
        </Typography>
      </Paper>
    </Container>
  )
}
