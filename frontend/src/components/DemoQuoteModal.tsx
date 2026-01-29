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
  ListItemText,
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

const DEMO_STEPS = ['Subir lista', 'Elegir proveedores', 'Cotizar']

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

export function DemoQuoteModal({ open, onClose, onUpgradeClick }: Props) {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ParsedItem[]>([])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [quotedItems, setQuotedItems] = useState<QuoteResult[]>([])
  const [quoting, setQuoting] = useState(false)

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
      // Mostrar TODOS los items detectados
      setItems(data.items)
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el archivo.')
    } finally {
      setLoading(false)
    }
  }

  const demoItems = items.slice(0, 5)
  const extraItems = items.slice(5)
  const MAX_DEMO_ITEMS = 5

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
    if (selectedProviders.length === 0) {
      setError('Selecciona al menos 1 proveedor')
      return
    }

    setQuoting(true)
    setError(null)
    const results: QuoteResult[] = []

    // Solo cotizar los primeros 5 items en modo demo
    for (const item of demoItems) {
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
  }, [demoItems, selectedProviders])

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
            En modo prueba puedes cotizar hasta <strong>5 items</strong> en <strong>2 tiendas</strong>.
            Regístrate gratis para cotizar sin límites en todas las tiendas.
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

        {/* Paso 2: Elegir proveedores */}
        {step === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Total de items detectados: {items.length}</strong>
              </Typography>
              <Typography variant="caption">
                En modo prueba se cotizarán los primeros <strong>{MAX_DEMO_ITEMS} items</strong>
              </Typography>
            </Alert>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Items habilitados para cotizar ({Math.min(items.length, MAX_DEMO_ITEMS)}/{items.length}):
            </Typography>
            <List dense sx={{ mb: 2, bgcolor: (t) => t.palette.mode === 'dark' ? 'background.paper' : 'grey.50', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
              {demoItems.map((item, idx) => (
                <ListItem key={idx} sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'success.dark' : 'success.lighter', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText
                    primary={item.detalle}
                    secondary={`Cantidad: ${item.cantidad || 1}`}
                    primaryTypographyProps={{ color: 'text.primary' }}
                    secondaryTypographyProps={{ color: 'text.secondary' }}
                  />
                </ListItem>
              ))}
            </List>

            {extraItems.length > 0 && (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>{extraItems.length} items adicionales detectados</strong> - Regístrate para cotizar todos
                  </Typography>
                </Alert>

                <Typography variant="subtitle1" gutterBottom>
                  Items deshabilitados (regístrate para acceso completo):
                </Typography>
                <List dense sx={{ mb: 3, bgcolor: (t) => t.palette.mode === 'dark' ? 'background.paper' : 'grey.100', borderRadius: 1, maxHeight: 150, overflow: 'auto', opacity: 0.6 }}>
                  {extraItems.map((item, idx) => (
                    <ListItem key={idx + MAX_DEMO_ITEMS}>
                      <ListItemText
                        primary={item.detalle}
                        secondary={`Cantidad: ${item.cantidad || 1}`}
                        primaryTypographyProps={{ color: 'text.primary' }}
                        secondaryTypographyProps={{ color: 'text.secondary' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

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
                ✓ Items cotizados: {Math.min(quotedItems.length, MAX_DEMO_ITEMS)} / {MAX_DEMO_ITEMS}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                ✓ Tiendas consultadas: {selectedProviders.length} / 2
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
              disabled={selectedProviders.length === 0 || quoting}
              startIcon={quoting ? <CircularProgress size={20} /> : undefined}
            >
              {quoting ? 'Cotizando...' : 'Cotizar'}
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
