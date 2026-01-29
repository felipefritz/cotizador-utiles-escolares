import { useState, useCallback } from 'react'
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
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CloseIcon from '@mui/icons-material/Close'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import { parseAiItemsOnly, quoteMultiProviders, type ParsedItem, type MultiProviderResponse } from '../api'

const DEMO_STEPS = ['Subir lista', 'Seleccionar items y tiendas', 'Resultados']

const PROVIDERS = [
  { id: 'dimeiggs', name: 'Dimeiggs', color: '#FF6B35' },
  { id: 'libreria_nacional', name: 'Librería Nacional', color: '#004E89' },
  { id: 'jamila', name: 'Jamila', color: '#F77F00' },
  { id: 'coloranimal', name: 'Coloranimal', color: '#06A77D' },
  { id: 'pronobel', name: 'Pronobel', color: '#D62828' },
  { id: 'prisa', name: 'Prisa', color: '#6A4C93' },
  { id: 'lasecretaria', name: 'La Secretaria', color: '#1982C4' },
]

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
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [quotedItems, setQuotedItems] = useState<QuoteResult[]>([])
  const [quoting, setQuoting] = useState(false)

  const MAX_DEMO_ITEMS = 5
  const selectedCount = items.filter(item => item.selected).length

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
    if (!isCurrentlySelected && selectedCount >= MAX_DEMO_ITEMS) {
      setError(`En modo prueba solo puedes seleccionar ${MAX_DEMO_ITEMS} items. Regístrate para acceso completo.`)
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
      // Limitar a 2 proveedores en modo demo
      if (selectedProviders.length >= 2) {
        setError('En modo prueba solo puedes seleccionar 2 proveedores. Regístrate para acceso completo.')
        return
      }
      setSelectedProviders([...selectedProviders, providerId])
      setError(null)
    }
  }

  const handleQuote = useCallback(async () => {
    const selectedItems = items.filter(item => item.selected)
    
    if (selectedProviders.length === 0) {
      setError('Selecciona al menos 1 proveedor')
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
          3 // Limitar resultados por proveedor
        )
        results.push({ item, quote })
      } catch (e) {
        results.push({ item, quote: null })
      }
    }

    setQuotedItems(results)
    setStep(2)
    setQuoting(false)
  }, [items, selectedProviders])

  const handleReset = () => {
    setStep(0)
    setFile(null)
    setItems([])
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
            <Typography variant="h6">Modo Prueba</Typography>
            <Chip label="Gratis" size="small" color="success" />
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            En modo prueba puedes <strong>seleccionar hasta 5 items</strong> de tu lista y cotizarlos en <strong>2 tiendas</strong>.
            Regístrate gratis para cotizar todos tus items en las 7 tiendas disponibles.
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
                {loading ? 'Analizando...' : 'Subir Lista de Útiles'}
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

        {/* Paso 1: Elegir items y proveedores */}
        {step === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Total de items detectados: {items.length}</strong>
              </Typography>
              <Typography variant="caption">
                Selecciona hasta <strong>{MAX_DEMO_ITEMS} items</strong> para cotizar (seleccionados: {selectedCount}/{MAX_DEMO_ITEMS})
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Selecciona los items que deseas cotizar:
            </Typography>
            <Paper variant="outlined" sx={{ mb: 3, maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {items.map((item, idx) => {
                  const isDisabled = !item.selected && selectedCount >= MAX_DEMO_ITEMS
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
              Selecciona hasta 2 tiendas (máximo en modo prueba):
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Seleccionadas: <strong>{selectedProviders.length}/2</strong>
              </Typography>
              {selectedProviders.length === 2 && (
                <Chip label="Límite alcanzado" size="small" color="warning" variant="outlined" />
              )}
            </Box>
            <FormGroup>
              {PROVIDERS.map((provider) => {
                const isSelected = selectedProviders.includes(provider.id)
                const isDisabled = !isSelected && selectedProviders.length >= 2
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
                        {isDisabled && (
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
                    {quotedItems.map((result, idx) => {
                      const bestHit = result.quote?.hits?.[0]
                      return (
                        <TableRow key={idx}>
                          <TableCell sx={{ color: 'text.primary' }}>{result.item.detalle}</TableCell>
                          <TableCell>
                            {bestHit ? (
                              <Chip
                                label={PROVIDERS.find(p => p.id === bestHit.provider)?.name || bestHit.provider}
                                size="small"
                                sx={{
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                }}
                              />
                            ) : (
                              <Typography sx={{ color: 'text.secondary' }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'text.primary' }}>
                            {bestHit?.price ? `$${bestHit.price.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell align="center">
                            {bestHit?.url ? (
                              <Link href={bestHit.url} target="_blank" rel="noopener" sx={{ color: 'primary.main' }}>
                                Ver
                              </Link>
                            ) : (
                              <Typography sx={{ color: 'text.secondary' }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Alert severity="warning" sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body2">
                <strong>Resumen de la cotización de prueba:</strong>
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                ✓ Items cotizados: {quotedItems.length}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                ✓ Tiendas consultadas: {selectedProviders.length} / 2
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                ✓ Items totales en tu lista: {items.length}
              </Typography>
            </Alert>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                ¿Te gustó? <strong>Regístrate gratis</strong> para cotizar sin límites, comparar en 7 tiendas y guardar tus cotizaciones.
              </Typography>
            </Alert>
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
            <Button variant="contained" color="success" onClick={onUpgradeClick}>
              Registrarse Gratis
            </Button>
          </>
        )}
        {step === 0 && (
          <Button onClick={handleClose}>Cancelar</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
