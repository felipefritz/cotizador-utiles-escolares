import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
  alpha,
  Alert,
  CircularProgress,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LockIcon from '@mui/icons-material/Lock'
import { SOURCES, type SourceId } from '../types'
import { api } from '../api'
import { useEffect, useState } from 'react'

type Props = {
  selected: SourceId[]
  onSelectionChange: (ids: SourceId[]) => void
  onNext: () => void
  onBack?: () => void
  hideBack?: boolean
}

interface UserLimits {
  plan: string
  limits: {
    max_items: number
    max_providers: number
    monthly_limit: number | null
  }
  usage: {
    quotes_this_month: number
    total_quotes: number
    monthly_remaining: number | null
  }
}

export function SourcesStep({ selected, onSelectionChange, onNext, onBack, hideBack }: Props) {
  const [limits, setLimits] = useState<UserLimits | null>(null)
  const [loadingLimits, setLoadingLimits] = useState(true)

  // Cargar límites del usuario
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/user/limits')
        setLimits(response.data)
      } catch (error) {
        // Si no está autenticado o hay error, permitir todos los proveedores
        console.log('No se pudieron cargar límites:', error)
      } finally {
        setLoadingLimits(false)
      }
    }
    fetchLimits()
  }, [])

  const toggle = (id: SourceId) => {
    const s = SOURCES.find((x) => x.id === id)
    if (!s?.available) return
    
    const isCurrentlySelected = selected.includes(id)
    
    if (isCurrentlySelected) {
      // Siempre permitir deseleccionar
      const next = selected.filter((x) => x !== id)
      onSelectionChange(next)
    } else {
      // Solo agregar si no se alcanzó el límite
      if (limits && selected.length >= limits.limits.max_providers) {
        return
      }
      const next = [...selected, id]
      onSelectionChange(next)
    }
  }

  const canSelectMore = !limits || selected.length < limits.limits.max_providers
  const maxProviders = limits?.limits.max_providers || 7
  const isLimitedUser = limits && limits.limits.max_providers < 7

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
        Elige las tiendas donde quieres cotizar
      </Typography>
      
      {loadingLimits ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          {isLimitedUser && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Tu plan permite cotizar en máximo <strong>{maxProviders} tiendas</strong> {selected.length > 0 && `(${selected.length} seleccionadas)`}.
              {selected.length < maxProviders && ` Puedes seleccionar ${maxProviders - selected.length} más.`}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {SOURCES.map((src) => {
              const active = selected.includes(src.id)
              const isDisabled = !src.available || (!active && !canSelectMore)
              
              return (
                <Card
                  key={src.id}
                  variant="outlined"
                  sx={{
                    width: 160,
                    opacity: isDisabled ? 0.5 : 1,
                    border: '2px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.06) : 'background.paper',
                    position: 'relative',
                  }}
                >
                  <CardActionArea
                    onClick={() => toggle(src.id)}
                    disabled={isDisabled}
                    sx={{ height: '100%', display: 'block' }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3, position: 'relative' }}>
                      {active && (
                        <CheckCircleIcon color="primary" sx={{ position: 'absolute', top: 8, right: 8, fontSize: 20 }} />
                      )}
                      <Typography variant="subtitle1" fontWeight={600}>
                        {src.name}
                      </Typography>
                      {!src.available && (
                        <Chip label="Próximamente" size="small" sx={{ mt: 1 }} color="default" variant="outlined" />
                      )}
                      {!active && !canSelectMore && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 1, color: 'text.secondary' }}>
                          <LockIcon sx={{ fontSize: 14 }} />
                          <Typography variant="caption">Límite alcanzado</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              )
            })}
          </Box>
        </>
      )}

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        {!hideBack && (
          <Button variant="outlined" onClick={onBack}>
            Atrás
          </Button>
        )}
        <Box sx={{ ml: 'auto' }}>
          <Button variant="contained" onClick={onNext} disabled={selected.length === 0}>
            Siguiente
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
