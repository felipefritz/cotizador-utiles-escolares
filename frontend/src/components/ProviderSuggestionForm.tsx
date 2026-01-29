import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { api } from '../api'

interface ProviderSuggestionFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ProviderSuggestionForm: React.FC<ProviderSuggestionFormProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    provider_name: '',
    description: '',
    website_url: '',
    email_contact: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.provider_name.trim() || !formData.description.trim()) {
      setError('Por favor completa al menos el nombre del proveedor y descripción')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await api.post('/suggestions', formData)
      setSuccess(true)
      setFormData({
        provider_name: '',
        description: '',
        website_url: '',
        email_contact: '',
      })

      // Cerrar automáticamente después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
        onClose()
        onSuccess()
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al enviar la sugerencia')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        provider_name: '',
        description: '',
        website_url: '',
        email_contact: '',
      })
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LightbulbIcon sx={{ color: '#FFC107' }} />
        Sugerir nuevo proveedor
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ¡Gracias! Tu sugerencia ha sido enviada. Nos pondremos en contacto pronto.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Nombre del proveedor"
            name="provider_name"
            value={formData.provider_name}
            onChange={handleChange}
            fullWidth
            disabled={loading}
            placeholder="Ej: Librería ABC"
          />
          <TextField
            label="Descripción"
            name="description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            multiline
            rows={4}
            disabled={loading}
            placeholder="Cuéntanos sobre este proveedor, por qué sería útil incluirlo, qué productos vende, etc."
          />
          <TextField
            label="Sitio web (opcional)"
            name="website_url"
            value={formData.website_url}
            onChange={handleChange}
            fullWidth
            disabled={loading}
            placeholder="https://ejemplo.com"
            type="url"
          />
          <TextField
            label="Email de contacto (opcional)"
            name="email_contact"
            value={formData.email_contact}
            onChange={handleChange}
            fullWidth
            disabled={loading}
            placeholder="contacto@ejemplo.com"
            type="email"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.provider_name.trim() || !formData.description.trim()}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          {loading && <CircularProgress size={20} />}
          {loading ? 'Enviando...' : 'Enviar sugerencia'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
