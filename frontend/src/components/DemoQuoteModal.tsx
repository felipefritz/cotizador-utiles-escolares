import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CloseIcon from '@mui/icons-material/Close'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import { api, parseAiItemsOnly, quoteMultiProviders, type ParsedItem, type MultiProviderResponse } from '../api'
import { AREAS, RECOMMENDED_SOURCE_BY_AREA, SOURCES, getSourceName, type AreaId } from '../types'

const DEMO_STEPS = ['Subir lista', 'Seleccionar items y fuentes', 'Resultados']

type Props = {
  open: boolean
  onClose: () => void
  onUpgradeClick: () => void
}

type QuoteResult = {
  item: ParsedItem
  quote: MultiProviderResponse | null
}

type SelectableItem = ParsedItem & {
  selected: boolean
}

export function DemoQuoteModal({ open, onClose, onUpgradeClick }: Props) {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<SelectableItem[]>([])
  const [area, setArea] = useState<AreaId>('general')
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [quotedItems, setQuotedItems] = useState<QuoteResult[]>([])
  const [quoting, setQuoting] = useState(false)
  const [plansEnabled, setPlansEnabled] = useState(true)
  const [availableProviderIds, setAvailableProviderIds] = useState<string[]>(['dimeiggs', 'libreria_nacional', 'kitchencenter'])

  const maxDemoItems = plansEnabled ? 5 : Number.POSITIVE_INFINITY
  const availableProviders = SOURCES.filter(
    (provider) => provider.areas.includes(area) && availableProviderIds.includes(provider.id)
  )
  // En supermercado la prueba compara la canasta entre todas las cadenas.
  // En otras áreas se conserva el límite comercial de dos fuentes.
  const maxDemoProviders = plansEnabled && area !== 'supermercado' ? 2 : availableProviders.length
  const selectedCount = items.filter(item => item.selected).length

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/settings/public')
        setPlansEnabled(!!res.data?.plans_enabled)
        if (Array.isArray(res.data?.available_providers)) {
          setAvailableProviderIds(res.data.available_providers)
        }
      } catch (e) {
        console.error('Error loading public settings:', e)
        setPlansEnabled(true)
      }
    }
    if (open) {
      loadSettings()
    }
  }, [open])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'))
    if (!['.pdf', '.docx', '.xlsx', '.xls'].includes(ext)) {
      setError('Formato no soportado. Use PDF, DOCX, XLS o XLSX.')
      return
    }

    setFile(f)
    setError(null)
    setLoading(true)

    try {
      const data = await parseAiItemsOnly(f)
      // Convertir items a SelectableItem con selected: false
      const selectableItems: SelectableItem[] = data.items.map(item => ({
        ...item,
        selected: false
      }))
      setItems(selectableItems)
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el archivo.')
    } finally {
      setLoading(false)
    }
  }

  const handleItemToggle = (index: number) => {
    const item = items[index]
    const isCurrentlySelected = item.selected
    
    // Si está tratando de seleccionar y ya alcanzó el límite, no permitir
    if (plansEnabled && !isCurrentlySelected && selectedCount >= maxDemoItems) {
      setError(`En modo prueba solo puedes seleccionar ${maxDemoItems} items. Regístrate para acceso completo.`)
      return
    }
    
    setError(null)
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], selected: !isCurrentlySelected }
    setItems(updatedItems)
  }

  const handleProviderToggle = (providerId: string) => {
    if (selectedProviders.includes(providerId)) {
      setSelectedProviders(selectedProviders.filter(p => p !== providerId))
    } else {
      // Supermercado permite todas sus cadenas; otras áreas mantienen 2.
      if (plansEnabled && selectedProviders.length >= maxDemoProviders) {
        setError(`En esta área puedes seleccionar hasta ${maxDemoProviders} fuentes en modo prueba.`)
        return
      }
      setSelectedProviders([...selectedProviders, providerId])
      setError(null)
    }
  }

  const handleQuote = useCallback(async () => {
    const selectedItems = items.filter(item => item.selected)
    
    if (selectedProviders.length === 0) {
      setError('Selecciona al menos 1 fuente')
      return
    }
    
    if (selectedItems.length === 0) {
      setError('Selecciona al menos 1 item para cotizar')
      return
    }

    setQuoting(true)
    setError(null)
    const results: QuoteResult[] = []

    // Cotizar solo los items seleccionados
    for (const item of selectedItems) {
      try {
        const quote = await quoteMultiProviders(
          item.detalle,
          selectedProviders,
          3, // Limitar resultados por fuente
          area,
        )
        results.push({ item, quote })
      } catch (e) {
        results.push({ item, quote: null })
      }
    }

    setQuotedItems(results)
    setStep(2)
    setQuoting(false)
  }, [items, selectedProviders, area])

  const handleReset = () => {
    setStep(0)
    setFile(null)
    setItems([])
    setArea('general')
    setSelectedProviders([])
    setQuotedItems([])
    setError(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockOpenIcon color="primary" />
            <Typography variant="h6">{plansEnabled ? 'Modo Prueba' : 'Cotización Completa'}</Typography>
            <Chip label={plansEnabled ? 'Gratis' : 'Acceso total'} size="small" color="success" />
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            {plansEnabled
              ? area === 'supermercado'
                ? 'En modo prueba puedes seleccionar hasta 5 items y comparar todas las cadenas de supermercado.'
                : 'En modo prueba puedes seleccionar hasta 5 items de tu lista y cotizarlos en 2 fuentes. Regístrate gratis para acceso completo.'
              : 'Acceso completo habilitado: puedes cotizar todos tus items en todas las fuentes disponibles.'}
          </Typography>
        </Alert>

        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {DEMO_STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Paso 1: Subir archivo */}
        {step === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <input
              id="demo-file-upload"
              type="file"
              accept=".pdf,.docx,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="demo-file-upload">
              <Button
                component="span"
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                disabled={loading}
              >
                {loading ? 'Analizando...' : 'Subir Lista de Productos'}
              </Button>
            </label>
            {file && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {file.name}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              PDF, DOCX, XLS, XLSX
            </Typography>
          </Box>
        )}

        {/* Paso 1: Elegir items y fuentes */}
        {step === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Total de items detectados: {items.length}</strong>
              </Typography>
              {plansEnabled && (
                <Typography variant="caption">
                  Selecciona hasta <strong>{maxDemoItems} items</strong> para cotizar (seleccionados: {selectedCount}/{maxDemoItems})
                </Typography>
              )}
            </Alert>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Selecciona los items que deseas cotizar:
            </Typography>
            <Paper variant="outlined" sx={{ mb: 3, maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {items.map((item, idx) => {
                  const isDisabled = plansEnabled && !item.selected && selectedCount >= maxDemoItems
                  return (
                    <ListItem
                      key={idx}
                      sx={{
                        borderBottom: idx < items.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        bgcolor: item.selected ? (t) => t.palette.mode === 'dark' ? 'success.dark' : 'success.lighter' : 'transparent',
                        opacity: isDisabled ? 0.6 : 1,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={item.selected}
                            onChange={() => handleItemToggle(idx)}
                            disabled={isDisabled}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {item.detalle}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Cantidad: {item.cantidad || 1}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0 }}
                      />
                    </ListItem>
                  )
                })}
              </List>
            </Paper>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              Selecciona el área:
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={area}
              onChange={(_, value: AreaId | null) => {
                if (!value) return
                setArea(value)
                const recommendedId = RECOMMENDED_SOURCE_BY_AREA[value]
                const related = SOURCES.filter(
                  (provider) => provider.areas.includes(value) && availableProviderIds.includes(provider.id)
                )
                setSelectedProviders(
                  value === 'supermercado'
                    ? related.map((provider) => provider.id)
                    : availableProviderIds.includes(recommendedId) ? [recommendedId] : []
                )
              }}
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, '& .MuiToggleButtonGroup-grouped': { borderRadius: '8px !important', border: '1px solid !important', borderColor: 'divider !important' } }}
            >
              {AREAS.map((item) => (
                <ToggleButton key={item.id} value={item.id} size="small" sx={{ textTransform: 'none' }}>
                  {item.name}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              {plansEnabled && area !== 'supermercado'
                ? 'Selecciona hasta 2 fuentes relacionadas:'
                : 'Selecciona las fuentes relacionadas:'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Seleccionadas: <strong>{selectedProviders.length}/{maxDemoProviders}</strong>
              </Typography>
              {plansEnabled && selectedProviders.length === maxDemoProviders && (
                <Chip label="Límite alcanzado" size="small" color="warning" variant="outlined" />
              )}
            </Box>
            <FormGroup>
              {availableProviders.map((provider) => {
                const isSelected = selectedProviders.includes(provider.id)
                const isDisabled = plansEnabled && !isSelected && selectedProviders.length >= maxDemoProviders
                return (
                  <FormControlLabel
                    key={provider.id}
                    control={
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleProviderToggle(provider.id)}
                        disabled={isDisabled}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: provider.color,
                            opacity: isDisabled ? 0.5 : 1,
                          }}
                        />
                        <Typography sx={{ opacity: isDisabled ? 0.5 : 1 }}>
                          {provider.name}
                        </Typography>
                        {plansEnabled && isDisabled && (
                          <Chip label="Límite alcanzado" size="small" variant="outlined" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    }
                    sx={{ opacity: isDisabled ? 0.6 : 1 }}
                  />
                )
              })}
            </FormGroup>
          </Box>
        )}

        {/* Paso 3: Resultados */}
        {step === 2 && (
          <Box>
            {quoting ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={48} />
                <Typography sx={{ mt: 2 }}>Cotizando productos...</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'background.paper' : 'grey.100' }}>
                      <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Producto</TableCell>
                      <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Tienda</TableCell>
                      <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 700 }}>Precio</TableCell>
                      <TableCell align="center" sx={{ color: 'text.primary', fontWeight: 700 }}>Link</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quotedItems.flatMap((result, itemIndex) => {
                      const perProvider: Record<string, number> = {}
                      const visibleHits = (result.quote?.hits ?? []).filter((hit) => {
                        const count = perProvider[hit.provider] ?? 0
                        if (count >= 3) return false
                        perProvider[hit.provider] = count + 1
                        return true
                      })
                      const rows = visibleHits.length > 0 ? visibleHits : [null]

                      return rows.map((hit, hitIndex) => {
                        const matchPercent = typeof hit?.relevance === 'number'
                          ? Math.round(hit.relevance * 100)
                          : null
                        return (
                          <TableRow key={`${itemIndex}-${hit?.provider ?? 'missing'}-${hitIndex}`}>
                            <TableCell sx={{ color: 'text.primary' }}>
                              <Typography variant="body2" fontWeight={hit ? 600 : 400}>
                                {hit?.title || result.item.detalle}
                              </Typography>
                              {hit && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Búsqueda: {result.item.detalle}
                                  {matchPercent != null && ` · Coincidencia ${matchPercent}%`}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {hit ? (
                                <Chip
                                  label={getSourceName(hit.provider)}
                                  size="small"
                                  sx={{ bgcolor: 'primary.main', color: 'white' }}
                                />
                              ) : (
                                <Typography sx={{ color: 'text.secondary' }}>—</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'text.primary' }}>
                              {hit?.price ? `$${hit.price.toLocaleString('es-CL')}` : '—'}
                            </TableCell>
                            <TableCell align="center">
                              {hit?.url ? (
                                <Link href={hit.url} target="_blank" rel="noopener" sx={{ color: 'primary.main' }}>
                                  Ver
                                </Link>
                              ) : (
                                <Typography sx={{ color: 'text.secondary' }}>—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Alert severity="warning" sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body2">
                <strong>{plansEnabled ? 'Resumen de la cotización de prueba:' : 'Resumen de la cotización:'}</strong>
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                ✓ Items cotizados: {quotedItems.length}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                ✓ Tiendas consultadas: {selectedProviders.length} / {maxDemoProviders}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                ✓ Items totales en tu lista: {items.length}
              </Typography>
            </Alert>

            {plansEnabled && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  ¿Te gustó? <strong>Regístrate gratis</strong> para cotizar sin límites, comparar más fuentes y guardar tus cotizaciones.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 1 && (
          <>
            <Button onClick={() => setStep(0)}>Atrás</Button>
            <Button
              variant="contained"
              onClick={handleQuote}
              disabled={selectedCount === 0 || selectedProviders.length === 0 || quoting}
              startIcon={quoting ? <CircularProgress size={20} /> : undefined}
            >
              {quoting ? 'Cotizando...' : `Cotizar ${selectedCount} ${selectedCount === 1 ? 'Item' : 'Items'}`}
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button onClick={handleReset}>Cotizar Otra Lista</Button>
            {plansEnabled ? (
              <Button variant="contained" color="success" onClick={onUpgradeClick}>
                Registrarse Gratis
              </Button>
            ) : (
              <Button variant="contained" onClick={handleClose}>
                Cerrar
              </Button>
            )}
          </>
        )}
        {step === 0 && (
          <Button onClick={handleClose}>Cancelar</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
