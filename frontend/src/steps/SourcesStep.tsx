import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  InputAdornment,
  TextField,
  Typography,
  alpha,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LockIcon from '@mui/icons-material/Lock'
import SearchIcon from '@mui/icons-material/Search'
import { AREAS, RECOMMENDED_SOURCE_BY_AREA, SOURCES, type AreaId, type SourceId } from '../types'
import {
  addWithinLimit,
  countAvailableByArea,
  filterSources,
  selectionForArea,
  sourcesForArea,
  toggleSource,
  withAvailability,
} from './sourceSelection'
import { API_BASE, api } from '../api'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

type Props = {
  selected: SourceId[]
  onSelectionChange: (ids: SourceId[]) => void
  area: AreaId
  onAreaChange: (area: AreaId) => void
  onNext: () => void
  onBack?: () => void
  hideBack?: boolean
}

interface UserLimits {
  plan: string
  limits: {
    max_items: number | null
    max_providers: number | null
    monthly_limit: number | null
  }
  usage: {
    quotes_this_month: number
    total_quotes: number
    monthly_remaining: number | null
  }
}

export function SourcesStep({ selected, onSelectionChange, area, onAreaChange, onNext, onBack, hideBack }: Props) {
  const { token } = useAuth()
  const [limits, setLimits] = useState<UserLimits | null>(null)
  const [loadingLimits, setLoadingLimits] = useState(true)
  const [search, setSearch] = useState('')
  const [availableProviderIds, setAvailableProviderIds] = useState<string[]>(
    SOURCES.filter((src) => src.available).map((src) => src.id)
  )

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const response = await api.get('/settings/public')
        const available = response.data?.available_providers
        if (Array.isArray(available)) {
          setAvailableProviderIds(available)
          // El frontend solo pinta los ids que publica el backend. Si el
          // backend está desactualizado se ven menos fuentes sin ninguna
          // señal de por qué, así que se deja el desfase a la vista en la
          // consola en lugar de tener que deducirlo.
          const desconocidas = SOURCES.filter((src) => !available.includes(src.id))
          if (desconocidas.length > 0) {
            console.warn(
              `[fuentes] El backend (${API_BASE}) publica ${available.length} de las ${SOURCES.length} que conoce este frontend. ` +
                `No disponibles: ${desconocidas.map((src) => src.id).join(', ')}. ` +
                'Si esperabas verlas, el backend está desactualizado.'
            )
          }
        }
      } catch (error) {
        console.log('No se pudieron cargar settings públicos:', error)
      }
    }
    fetchPublicSettings()
  }, [])

  const sourceList = useMemo(
    () => withAvailability(SOURCES, availableProviderIds),
    [availableProviderIds]
  )

  const areaSources = useMemo(() => sourcesForArea(sourceList, area), [area, sourceList])

  // Con varias decenas de fuentes por área, el buscador evita tener que
  // recorrer toda la grilla para encontrar una tienda puntual.
  const visibleSources = useMemo(() => filterSources(areaSources, search), [areaSources, search])

  const sourceCountByArea = useMemo(
    () => countAvailableByArea(sourceList, AREAS.map((item) => item.id)),
    [sourceList]
  )

  // Cargar límites del usuario y auto-limitar selección
  useEffect(() => {
    const fetchLimits = async () => {
      if (!token) {
        setLimits(null)
        setLoadingLimits(false)
        return
      }
      try {
        const response = await api.get('/user/limits')
        setLimits(response.data)

        // Auto-limitar proveedores si exceden el límite del plan
        const maxProviders = response.data.limits.max_providers
        if (maxProviders !== null && maxProviders !== undefined && selected.length > maxProviders) {
          const limited = selected.slice(0, maxProviders)
          onSelectionChange(limited)
        }
      } catch (error) {
        // Si no está autenticado o hay error, permitir todos los proveedores
        console.log('No se pudieron cargar límites:', error)
      } finally {
        setLoadingLimits(false)
      }
    }
    fetchLimits()
  }, [token])

  const maxProvidersLimit = limits?.limits.max_providers ?? null
  const canSelectMore = maxProvidersLimit === null || selected.length < maxProvidersLimit
  const availableSourceCount = areaSources.filter((src) => src.available).length
  const maxProviders = maxProvidersLimit ?? availableSourceCount
  const isLimitedUser = maxProvidersLimit !== null && maxProvidersLimit < availableSourceCount
  const isFreePlan = limits?.plan === 'free'

  const toggle = (id: SourceId) => {
    onSelectionChange(toggleSource(selected, sourceList.find((x) => x.id === id), maxProvidersLimit))
  }

  const selectAllVisible = () => {
    onSelectionChange(addWithinLimit(selected, visibleSources, maxProvidersLimit))
  }

  const clearSelection = () => onSelectionChange([])

  const selectArea = (nextArea: AreaId | null) => {
    if (!nextArea || nextArea === area) return
    onAreaChange(nextArea)
    setSearch('')
    onSelectionChange(
      selectionForArea(sourceList, selected, nextArea, RECOMMENDED_SOURCE_BY_AREA[nextArea], maxProvidersLimit)
    )
  }

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto' }}>
      <Typography variant="h6" color="text.primary" sx={{ mb: 0.5, fontWeight: 800 }}>
        1. Elige el área de la compra
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Solo mostraremos fuentes que venden productos relacionados con esa área.
      </Typography>

      <ToggleButtonGroup
        exclusive
        value={area}
        onChange={(_, value: AreaId | null) => selectArea(value)}
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, '& .MuiToggleButtonGroup-grouped': { borderRadius: '8px !important', border: '1px solid !important', borderColor: 'divider !important' } }}
      >
        {AREAS.map((item) => (
          <ToggleButton key={item.id} value={item.id} sx={{ px: 2, py: 1, textTransform: 'none' }}>
            {item.name}
            <Chip
              label={sourceCountByArea[item.id] ?? 0}
              size="small"
              sx={{ ml: 1, height: 20, fontSize: 11, pointerEvents: 'none' }}
            />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography variant="h6" color="text.primary" sx={{ mb: 0.5, fontWeight: 800 }}>
        2. Elige las fuentes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {AREAS.find((item) => item.id === area)?.description}
      </Typography>

      {loadingLimits ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          {isLimitedUser && (
            <Alert severity={isFreePlan ? 'warning' : 'info'} sx={{ mb: 2 }}>
              {isFreePlan && <><strong>Plan Gratis:</strong> no se consultan todas las fuentes del área. </>}
              Tu plan permite cotizar en máximo <strong>{maxProviders} fuentes</strong> {selected.length > 0 && `(${selected.length} seleccionadas)`}.
              {selected.length < maxProviders && ` Puedes seleccionar ${maxProviders - selected.length} más.`}
              {' '}Las fuentes no seleccionadas no cuentan como “sin resultados”; simplemente no fueron consultadas.
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <TextField
              size="small"
              placeholder="Buscar fuente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ flex: '1 1 240px', maxWidth: 360 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                {selected.length} de {availableSourceCount} seleccionadas
              </Typography>
              <Button size="small" onClick={selectAllVisible} disabled={!canSelectMore}>
                {search ? 'Seleccionar filtradas' : 'Seleccionar todas'}
              </Button>
              <Button size="small" color="inherit" onClick={clearSelection} disabled={selected.length === 0}>
                Limpiar
              </Button>
            </Box>
          </Box>

          {areaSources.length === 0 && (
            <Alert severity="warning">No hay fuentes registradas para esta área.</Alert>
          )}

          {areaSources.length > 0 && visibleSources.length === 0 && (
            <Alert severity="info">Ninguna fuente de esta área coincide con «{search}».</Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {visibleSources.map((src) => {
              const active = selected.includes(src.id)
              const isDisabled = !src.available || (!active && !canSelectMore)

              return (
                <Card
                  key={src.id}
                  variant="outlined"
                  sx={{
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
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: src.color,
                          mx: 'auto',
                          mb: 1,
                        }}
                      />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {src.name}
                      </Typography>
                      {src.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {src.description}
                        </Typography>
                      )}
                      {!src.available && (
                        <Chip label="No disponible" size="small" sx={{ mt: 1 }} color="default" variant="outlined" />
                      )}
                      {!active && !canSelectMore && src.available && (
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
