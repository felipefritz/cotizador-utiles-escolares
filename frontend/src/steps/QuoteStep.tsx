import { useCallback, useState, useMemo, useEffect } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import SaveIcon from '@mui/icons-material/Save'
import type { ItemQuote, SourceId } from '../types'
import { formatCLP } from '../utils/format'
import { quoteMultiProviders, api } from '../api'
import { QuoteProgressModal } from '../components/QuoteProgressModal'
import { useAuth } from '../contexts/AuthContext'

type Props = {
  results: ItemQuote[]
  onReset: () => void
  sources: SourceId[]
  onEditSelection: () => void
}

interface UserLimits {
  plan: string
  limits: {
    max_items: number
    max_providers: number
    monthly_limit: number | null
  }
}

const FOUND_STATUSES = ['ok', 'ok_with_price']
const MATCH_THRESHOLD = 0.4

function isFound(q: { status?: string } | undefined): boolean {
  return !!q && FOUND_STATUSES.includes(q.status || '')
}

export function QuoteStep({ results, onReset, sources, onEditSelection }: Props) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoted, setQuoted] = useState(false)
  const [quotedResults, setQuotedResults] = useState<ItemQuote[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showProgress, setShowProgress] = useState(false)
  const [quotedCount, setQuotedCount] = useState(0)
  const [workingItems, setWorkingItems] = useState<ItemQuote[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [quoteTitle, setQuoteTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [limits, setLimits] = useState<UserLimits | null>(null)
  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [providerModalKey, setProviderModalKey] = useState<string | null>(null)
  const [summaryInfoOpen, setSummaryInfoOpen] = useState(false)

  // Cargar límites del usuario
  useEffect(() => {
    const fetchLimits = async () => {
      if (!token) {
        setLimits(null)
        return
      }
      try {
        const response = await api.get('/user/limits')
        setLimits(response.data)
      } catch (error) {
        console.log('No se pudieron cargar límites:', error)
      }
    }
    fetchLimits()
  }, [token])

  // Limitar proveedores según el plan
  const allowedSources = useMemo(() => {
    if (!limits) return sources
    if (limits.limits.max_providers === null || limits.limits.max_providers === undefined) {
      return sources
    }
    return sources.slice(0, limits.limits.max_providers)
  }, [sources, limits])

  // Limitar items según el plan
  const allowedResults = useMemo(() => {
    if (!limits) return results
    if (limits.limits.max_items === null || limits.limits.max_items === undefined) {
      return results
    }
    return results.slice(0, limits.limits.max_items)
  }, [results, limits])

  const handleQuote = useCallback(async () => {
    if (!allowedResults.length) return
    
    setLoading(true)
    setError(null)
    setShowProgress(true)
    setQuotedCount(0)
    setWorkingItems(allowedResults)
    setBatchMode(false)
    
    try {
      const updated: ItemQuote[] = []

      for (let i = 0; i < allowedResults.length; i += 1) {
        const item = allowedResults[i]
        const query = item.item.detalle || item.item.item_original

        try {
          const quote = await quoteMultiProviders(query, allowedSources, item.quantity)
          updated.push({
            item: item.item,
            quantity: item.quantity,
            multi: quote,
          })
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Error al cotizar'
          setError(msg)
          updated.push({
            item: item.item,
            quantity: item.quantity,
            multi: {
              query,
              status: 'error',
              providers_queried: allowedSources,
              providers_failed: [],
              hits: [],
              error: msg,
            },
          })
        }

        setQuotedResults([...updated])
        setQuotedCount(i + 1)
      }

      setQuoted(true)
      setShowProgress(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cotizar')
      setShowProgress(false)
    } finally {
      setLoading(false)
    }
  }, [allowedResults, allowedSources])

  const handleEditItem = (index: number, newName: string) => {
    const newItems = [...workingItems]
    newItems[index] = {
      ...newItems[index],
      item: {
        ...newItems[index].item,
        detalle: newName,
      },
    }
    setWorkingItems(newItems)
  }

  const handleRetryItem = async (index: number) => {
    try {
      const item = workingItems[index]
      const query = item.item.detalle || item.item.item_original
      const quote = await quoteMultiProviders(query, allowedSources, item.quantity)
      
      const newResults = [...quotedResults]
      newResults[index] = {
        item: item.item,
        quantity: item.quantity,
        multi: quote,
      }
      setQuotedResults(newResults)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al re-cotizar')
    }
  }

  const handleSaveQuote = async () => {
    if (!quoteTitle.trim()) {
      alert('Por favor ingresa un nombre para la cotización')
      return
    }

    setSaving(true)
    try {
      const rawText = quotedResults
        .map(r => `${r.item.detalle || r.item.item_original} (x${r.quantity})`)
        .join('\n')

      const itemsData = quotedResults.map(r => {
        const q = r.multi
        // El backend devuelve hits[], no best_hit
        const firstHit = q && (q as any).hits && (q as any).hits.length > 0 ? (q as any).hits[0] : null
        
        return {
          detalle: r.item.detalle || r.item.item_original,
          cantidad: r.quantity,
          provider: firstHit ? firstHit.provider : null,
          price: firstHit ? (firstHit.price || 0) : 0,
          url: firstHit ? (firstHit.url || null) : null,
        }
      })

      const resultsData: Record<string, any> = {}
      quotedResults.forEach(r => {
        const q = r.multi
        // El backend devuelve hits[], no best_hit
        const firstHit = q && (q as any).hits && (q as any).hits.length > 0 ? (q as any).hits[0] : null
        
        if (firstHit) {
          const provider = firstHit.provider
          if (!resultsData[provider]) {
            resultsData[provider] = {
              items: [],
              item_prices: {},
              item_urls: {},
              total_price: 0,
            }
          }
          const itemName = r.item.detalle || r.item.item_original
          resultsData[provider].items.push(itemName)
          const price = firstHit.price || 0
          const url = firstHit.url || null
          resultsData[provider].item_prices[itemName] = price
          if (url) {
            resultsData[provider].item_urls[itemName] = url
          }
          resultsData[provider].total_price += price * r.quantity
        }
      })

      await api.post('/user/quotes', {
        title: quoteTitle,
        raw_text: rawText,
        items: itemsData,
        results: Object.keys(resultsData).length > 0 ? resultsData : null,
        notes: '',
      })

      alert('✅ Cotización guardada exitosamente')
      setSaveDialogOpen(false)
      setQuoteTitle('')
      // No reseteamos porque el usuario podría guardar otra vez
    } catch (err) {
      console.error('Error guardando cotización:', err)
      alert('❌ Error al guardar la cotización')
    } finally {
      setSaving(false)
    }
  }

  const displayResults = quoted ? quotedResults : results
  const isMultiProvider = displayResults.some(r => r.multi)
  
  // Definir funciones ANTES de usarlas en useMemo
  const getProviderName = (provider: string): string => {
    const names: Record<string, string> = {
      dimeiggs: 'Dimeiggs',
      libreria_nacional: 'Librería Nacional',
      jamila: 'Jamila',
      coloranimal: 'Coloranimal',
      pronobel: 'Pronobel',
      prisa: 'Prisa',
      lasecretaria: 'La Secretaria',
    }
    return names[provider] || provider
  }

  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      dimeiggs: '#2196F3',
      libreria_nacional: '#7B1FA2',
      jamila: '#00897B',
      coloranimal: '#6D4C41',
      pronobel: '#5E35B1',
      prisa: '#C2185B',
      lasecretaria: '#455A64',
    }
    return colors[provider] || '#757575'
  }
  
  const { subtotal, itemsConPrecio, itemsPendientes, pendientes } = useMemo(() => {
    let sub = 0
    let conPrecio = 0
    const pen: ItemQuote[] = []

    for (const r of displayResults) {
      const q = r.multi || r.dimeiggs
      let unit: number | null = null
      let provider = ''
      
      // Extrae el price y provider - misma lógica que en la tabla
      if ((q as any)?.unit_price) {
        unit = (q as any).unit_price
      }
      
      if (r.multi && (r.multi as any).best_hit) {
        const bestHit = (r.multi as any).best_hit
        if (bestHit.price && !unit) {
          unit = bestHit.price
        }
        if (!provider && bestHit.provider) {
          provider = bestHit.provider
        }
      } else if ((q as any)?.hits && (q as any).hits.length > 0) {
        const firstHit = (q as any).hits[0]
        if (firstHit.price && !unit) {
          unit = firstHit.price
        }
        if (!provider && firstHit.provider) {
          provider = firstHit.provider
        }
      }
      
      if (!provider && (q as any)?.provider) {
        provider = (q as any).provider
      }
      
      const lineTotal = unit != null ? unit * r.quantity : null

      if (unit != null && lineTotal != null) {
        sub += lineTotal
        conPrecio += 1
        
        // Agregar al mapa por proveedor para el resumen
      } else {
        pen.push(r)
      }
    }

    return {
      subtotal: sub,
      itemsConPrecio: conPrecio,
      itemsPendientes: pen.length,
      pendientes: pen,
    }
  }, [displayResults])

  const providerTotals = useMemo(() => {
    const providers = sources
    const totals: Record<string, { 
      name: string; 
      total: number; 
      found: number; 
      missing: number; 
      lowMatches: number; 
      items: Array<{ item: ItemQuote; price: number; relevance: number; url?: string; title?: string }>;
      lowMatchItems: Array<{ item: ItemQuote; price: number; relevance: number; url?: string; title?: string }>;
      missingItems: Array<{ item: ItemQuote; reason?: string }>
    }> = {}

    for (const p of providers) {
      totals[p] = { name: getProviderName(p), total: 0, found: 0, missing: 0, lowMatches: 0, items: [], lowMatchItems: [], missingItems: [] }
    }

    for (const r of displayResults) {
      const q = r.multi || r.dimeiggs
      const hits = (q as any)?.hits || []
      const qty = r.quantity

      for (const p of providers) {
        const providerHits = hits.filter((h: any) => h?.provider === p && h?.price != null)
        const validHits = providerHits.filter((h: any) => (typeof h?.relevance === 'number' ? h.relevance >= MATCH_THRESHOLD : false))
        const lowHits = providerHits.filter((h: any) => (typeof h?.relevance === 'number' ? h.relevance < MATCH_THRESHOLD : false))
        let bestHit: any = null
        let bestLowHit: any = null

        if (validHits.length) {
          bestHit = validHits.reduce((min: any, h: any) => {
            const price = Number(h.price)
            if (Number.isNaN(price)) return min
            if (!min) return h
            return Number(min.price) <= price ? min : h
          }, null)
        } else if (lowHits.length) {
          bestLowHit = lowHits.reduce((min: any, h: any) => {
            const price = Number(h.price)
            if (Number.isNaN(price)) return min
            if (!min) return h
            return Number(min.price) <= price ? min : h
          }, null)
          totals[p].lowMatches += 1
        } else if ((q as any)?.provider === p && (q as any)?.unit_price != null) {
          bestHit = {
            price: Number((q as any).unit_price),
            relevance: 1,
            url: (q as any).url,
            title: (q as any).title,
          }
        }

        if (bestHit && bestHit.price != null && !Number.isNaN(Number(bestHit.price))) {
          const price = Number(bestHit.price)
          totals[p].total += price * qty
          totals[p].found += 1
          totals[p].items.push({
            item: r,
            price,
            relevance: typeof bestHit.relevance === 'number' ? bestHit.relevance : 0,
            url: bestHit.url,
            title: bestHit.title,
          })
        } else if (bestLowHit && bestLowHit.price != null && !Number.isNaN(Number(bestLowHit.price))) {
          const price = Number(bestLowHit.price)
          totals[p].lowMatchItems.push({
            item: r,
            price,
            relevance: typeof bestLowHit.relevance === 'number' ? bestLowHit.relevance : 0,
            url: bestLowHit.url,
            title: bestLowHit.title,
          })
        } else {
          totals[p].missing += 1
          totals[p].missingItems.push({
            item: r,
            reason: (q as any)?.reason || (q as any)?.error || 'Sin resultados',
          })
        }
      }
    }

    return totals
  }, [displayResults, sources])

  const openProviderModal = (providerKey: string) => {
    setProviderModalKey(providerKey)
    setProviderModalOpen(true)
  }

  const pendingReason = (r: ItemQuote) => {
    const q = r.multi || r.dimeiggs
    return (q as any)?.reason ?? q?.error ?? 'Sin resultados'
  }

  const handleItemToggle = (itemIndex: number, hitIndex: number) => {
    const key = `${itemIndex}:${hitIndex}`
    const newSelected = new Set(selectedItems)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedItems(newSelected)
  }

  const isItemSelected = (itemIndex: number, hitIndex: number) => {
    return selectedItems.has(`${itemIndex}:${hitIndex}`)
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h6" color="text.primary" sx={{ mb: 2 }}>
        {!quoted ? 'Artículos seleccionados' : `Resultados de cotización ${isMultiProvider && '(Multi-tienda)'}`}
      </Typography>

      {!quoted ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.primary" sx={{ mb: 3 }}>
            {results.length} artículos listos para cotizar en {sources.length} {sources.length === 1 ? 'tienda' : 'tiendas'}.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={onEditSelection}>
              Editar selección
            </Button>
            <Button 
              variant="contained" 
              onClick={handleQuote}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Cotizando...
                </>
              ) : (
                'Cotizar'
              )}
            </Button>
          </Box>
        </Paper>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : displayResults.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No hay ítems para mostrar.</Typography>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Resumen por item (mejor precio)
            </Typography>
            <IconButton size="small" onClick={() => setSummaryInfoOpen(true)} aria-label="Info resumen">
              <InfoOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'background.paper' : 'grey.100' }}>
                  <TableCell sx={{ width: 56, color: 'text.primary', fontWeight: 700 }} />
                  <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Detalle</TableCell>
                  <TableCell align="center" sx={{ width: 90, color: 'text.primary', fontWeight: 700 }}>Cantidad</TableCell>
                  <TableCell align="center" sx={{ width: 120, color: 'text.primary', fontWeight: 700 }}>Proveedor</TableCell>
                  <TableCell align="right" sx={{ width: 120, color: 'text.primary', fontWeight: 700 }}>Precio unit.</TableCell>
                  <TableCell align="right" sx={{ width: 130, color: 'text.primary', fontWeight: 700 }}>Total línea</TableCell>
                  <TableCell align="center" sx={{ width: 130, color: 'text.primary', fontWeight: 700 }}>Estado</TableCell>
                  <TableCell align="center" sx={{ width: 180, color: 'text.primary', fontWeight: 700 }}>Producto seleccionado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayResults.map((r, idx) => {
                  const q = r.multi || r.dimeiggs
                  let unit: number | null = null
                  let providerName = ''
                  let img = ''
                  let productUrl = ''
                  let productTitle = ''
                  let matchPercent: number | null = null
                  
                  // Extrae correctamente el precio y proveedor
                  // Prioridad 1: unit_price agregado por backend (si ya procesó el best_hit)
                  if ((q as any)?.unit_price) {
                    unit = (q as any).unit_price
                  }
                  
                  // Prioridad 2: best_hit si existe (mejor hit del multi-provider)
                  if (r.multi && (r.multi as any).best_hit) {
                    const bestHit = (r.multi as any).best_hit
                    if (bestHit.price && !unit) {
                      unit = bestHit.price
                    }
                    if (!providerName && bestHit.provider) {
                      providerName = getProviderName(bestHit.provider)
                    }
                    if (!img && bestHit.image_url) {
                      img = bestHit.image_url
                    }
                    if (!productUrl && bestHit.url) {
                      productUrl = bestHit.url
                    }
                    if (!productTitle && bestHit.title) {
                      productTitle = bestHit.title
                    }
                    if (matchPercent == null && typeof bestHit.relevance === 'number') {
                      matchPercent = Math.round(bestHit.relevance * 100)
                    }
                  }
                  // Prioridad 3: primer hit si no hay best_hit
                  else if ((q as any)?.hits && (q as any).hits.length > 0) {
                    const firstHit = (q as any).hits[0]
                    if (firstHit.price && !unit) {
                      unit = firstHit.price
                    }
                    if (!providerName && firstHit.provider) {
                      providerName = getProviderName(firstHit.provider)
                    }
                    if (!img && firstHit.image_url) {
                      img = firstHit.image_url
                    }
                    if (!productUrl && firstHit.url) {
                      productUrl = firstHit.url
                    }
                    if (!productTitle && firstHit.title) {
                      productTitle = firstHit.title
                    }
                    if (matchPercent == null && typeof firstHit.relevance === 'number') {
                      matchPercent = Math.round(firstHit.relevance * 100)
                    }
                  }
                  
                  // Obtener proveedor de la propiedad provider si aún no lo tiene
                  if (!providerName && (q as any)?.provider) {
                    providerName = getProviderName((q as any).provider)
                  }
                  
                  // Obtener imagen de la propiedad image_url si aún no la tiene
                  if (!img && (q as any)?.image_url) {
                    img = (q as any).image_url
                  }
                  
                  // Obtener URL y título de propiedades fallback
                  if (!productUrl && (q as any)?.url) {
                    productUrl = (q as any).url
                  }
                  if (!productTitle && (q as any)?.title) {
                    productTitle = (q as any).title
                  }
                  
                  const lineTotal = unit != null ? unit * r.quantity : null
                  const found = isFound(q)

                  return (
                    <TableRow
                      key={idx}
                      sx={{
                        bgcolor: found ? 'transparent' : (t) => t.palette.mode === 'light' ? 'grey.50' : 'grey.900',
                      }}
                    >
                      <TableCell sx={{ width: 56, py: 0.5 }}>
                        {img ? (
                          <Box
                            component="img"
                            src={img}
                            alt=""
                            sx={{
                              width: 40,
                              height: 40,
                              objectFit: 'contain',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {r.item.detalle || r.item.item_original}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{r.quantity}</TableCell>
                      <TableCell align="center">
                        {providerName ? (
                          <Chip 
                            label={providerName} 
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{formatCLP(unit)}</TableCell>
                      <TableCell align="right">{formatCLP(lineTotal)}</TableCell>
                      <TableCell align="center">
                        {found ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              icon={<CheckCircleOutlineIcon />}
                              label="Cotizado"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                            {matchPercent != null && matchPercent < 40 && (
                              <Chip
                                icon={<WarningAmberIcon />}
                                label="Baja coincidencia"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        ) : (
                          <Chip
                            icon={<WarningAmberIcon />}
                            label="Pendiente"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {found && productUrl ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link
                              href={productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, fontSize: '0.875rem' }}
                            >
                              Ver producto
                              <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Link>
                            {matchPercent != null && (
                              <Chip
                                label={`Coincidencia ${matchPercent}%`}
                                size="small"
                                color={matchPercent >= 70 ? 'success' : matchPercent >= 40 ? 'warning' : 'error'}
                                variant="outlined"
                              />
                            )}
                            <Checkbox
                              size="small"
                              checked={isItemSelected(idx, 0)}
                              onChange={() => handleItemToggle(idx, 0)}
                              title="Marcar como comprado"
                            />
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={summaryInfoOpen} onClose={() => setSummaryInfoOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Como leer esta tabla</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Esta tabla muestra, para cada item, el mejor precio encontrado entre las tiendas seleccionadas.
                Si un item no supera el umbral de coincidencia (40%), no se incluye en el total y se muestra
                como baja coincidencia en el detalle por proveedor.
              </Typography>
              <Typography variant="body2">
                En la columna "Producto seleccionado" se muestra el producto exacto que se uso para ese item,
                con su enlace y porcentaje de coincidencia.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSummaryInfoOpen(false)}>Entendido</Button>
            </DialogActions>
          </Dialog>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Opciones por ítem
          </Typography>
          {displayResults.map((r, idx) => {
            const q = r.multi || r.dimeiggs
            // Obtener imagen del mejor hit si es multi-proveedor, si no usar dimeiggs
            const summaryImage = r.multi && (r.multi as any).best_hit?.image_url 
              ? (r.multi as any).best_hit.image_url 
              : r.dimeiggs?.image_url
            
            return (
            <Accordion key={idx} defaultExpanded={idx === 0} variant="outlined" sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {summaryImage && (
                  <Box
                    component="img"
                    src={summaryImage}
                    alt=""
                    sx={{
                      width: 36,
                      height: 36,
                      objectFit: 'contain',
                      borderRadius: 1,
                      mr: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                )}
                <Typography variant="body2">
                  {r.item.detalle || r.item.item_original} × {r.quantity}
                </Typography>
                {q?.status && FOUND_STATUSES.includes(q.status) && q.hits?.length ? (
                  <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                    {q.hits.length} opciones
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {pendingReason(r)}
                  </Typography>
                )}
              </AccordionSummary>
              <AccordionDetails>
                {q?.hits?.length ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
                    {summaryImage && (
                      <Box
                        component="img"
                        src={summaryImage}
                        alt=""
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'contain',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Box component="ul" sx={{ m: 0, pl: 2.5, flex: 1 }}>
                      {q.hits.slice(0, 8).map((h, i) => (
                        <Box component="li" key={i} sx={{ mb: 1 }}>
                          <Link
                            href={h.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                          >
                            {h.title}
                            {(h as any).brand && ` (${(h as any).brand})`}
                            {h.price != null && ` · ${formatCLP(h.price)}`}
                            {isMultiProvider && (h as any).provider && ` [${getProviderName((h as any).provider)}]`}
                            {typeof (h as any).relevance === 'number' && ` · ${Math.round((h as any).relevance * 100)}%`}
                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                          </Link>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {pendingReason(r)}
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
            )
          })}

          {isMultiProvider && Object.keys(providerTotals).length > 0 && (
            <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                📦 Resumen por Proveedor
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {Object.entries(providerTotals).map(([providerKey, providerData]) => {
                  if (!providerData.found && !providerData.lowMatches) return null
                  const subtotalByProvider = providerData.total
                  const totalItems = providerData.found
                  // Contar pendientes por proveedor (items que no tienen precio en este proveedor pero sí en otros)
                  const pendientesPorProveedor = pendientes.filter(p => {
                    const pq = p.multi || p.dimeiggs
                    if (p.multi && (p.multi as any).hits) {
                      // Si tiene hits del proveedor, no es pendiente para este proveedor
                      return !(p.multi && (p.multi as any).hits && (p.multi as any).hits.some((h: any) => h.provider === providerKey))
                    }
                    return (pq as any)?.provider === providerKey
                  }).length
                  
                  return (
                    <Paper 
                      key={providerKey} 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        bgcolor: (t) => t.palette.mode === 'light' ? '#f5f5f5' : 'background.paper',
                        borderLeft: '4px solid',
                        borderColor: 'primary.main',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 2 }
                      }}
                    >
                      <Typography 
                        variant="subtitle1" 
                        fontWeight={700}
                        sx={{ mb: 1.5, color: 'primary.main' }}
                      >
                        {providerData.name}
                      </Typography>
                      <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                            Subtotal:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            fontWeight={700} 
                            sx={{ fontSize: '1.1rem', color: 'primary.main' }}
                          >
                            {formatCLP(subtotalByProvider)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <Button
                            size="small"
                            variant="contained"
                            endIcon={<ShoppingCartIcon sx={{ fontSize: 16 }} />}
                            href={`https://${providerKey === 'dimeiggs' ? 'www.dimeiggs.cl' : 
                                       providerKey === 'libreria_nacional' ? 'nacional.cl' :
                                       providerKey === 'jamila' ? 'www.jamila.cl' :
                                       providerKey === 'coloranimal' ? 'www.coloranimal.cl' :
                                       providerKey === 'pronobel' ? 'pronobel.cl' :
                                       providerKey === 'prisa' ? 'www.prisa.cl' :
                                       providerKey === 'lasecretaria' ? 'lasecretaria.cl' : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              flex: 1,
                              bgcolor: 'primary.main',
                              '&:hover': { opacity: 0.9 }
                            }}
                          >
                            Ir a tienda
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openProviderModal(providerKey)}
                            sx={{ flex: 1 }}
                          >
                            Ver items
                          </Button>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Box sx={{ flex: 1, textAlign: 'center', p: 1, bgcolor: (t) => t.palette.success.light, borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={600} color="success.dark">
                              {totalItems}
                            </Typography>
                            <Typography variant="caption" color="success.dark">
                              Cotizados
                            </Typography>
                          </Box>
                          {providerData.lowMatches > 0 && (
                            <Box sx={{ flex: 1, textAlign: 'center', p: 1, bgcolor: (t) => t.palette.warning.light, borderRadius: 1 }}>
                              <Typography variant="body2" fontWeight={600} color="warning.dark">
                                {providerData.lowMatches}
                              </Typography>
                              <Typography variant="caption" color="warning.dark">
                                Baja coincidencia
                              </Typography>
                            </Box>
                          )}
                          {pendientesPorProveedor > 0 && (
                            <Box sx={{ flex: 1, textAlign: 'center', p: 1, bgcolor: (t) => t.palette.warning.light, borderRadius: 1 }}>
                              <Typography variant="body2" fontWeight={600} color="warning.dark">
                                {pendientesPorProveedor}
                              </Typography>
                              <Typography variant="caption" color="warning.dark">
                                Pendientes
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  )
                })}
              </Box>
            </Paper>
          )}

          {quoted && Object.keys(providerTotals).length > 0 && (
            <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Comparación total por proveedor (todos los productos)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Suma el mejor precio encontrado por proveedor para cada ítem. Útil para comparar el total completo entre tiendas.
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'background.paper' : 'grey.100' }}>
                      <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>Proveedor</TableCell>
                      <TableCell align="center" sx={{ color: 'text.primary', fontWeight: 700 }}>Ítems con precio</TableCell>
                      <TableCell align="center" sx={{ color: 'text.primary', fontWeight: 700 }}>Ítems sin precio</TableCell>
                      <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 700 }}>Total estimado</TableCell>
                      <TableCell align="center" sx={{ color: 'text.primary', fontWeight: 700 }}>Detalle</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sources.map((providerId) => {
                      const p = providerTotals[providerId]
                      if (!p) return null
                      return (
                        <TableRow key={providerId}>
                          <TableCell>
                            <Chip
                              label={p.name}
                              size="small"
                              sx={{ fontWeight: 600, bgcolor: getProviderColor(providerId), color: '#fff' }}
                            />
                          </TableCell>
                          <TableCell align="center">{p.found}</TableCell>
                          <TableCell align="center">{p.missing}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCLP(p.total)}
                          </TableCell>
                          <TableCell align="center">
                            <Button size="small" variant="outlined" onClick={() => openProviderModal(providerId)}>
                              Ver items
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          <Dialog open={providerModalOpen} onClose={() => setProviderModalOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>
              {providerModalKey ? `Items cotizados en ${getProviderName(providerModalKey)}` : 'Items cotizados'}
            </DialogTitle>
            <DialogContent dividers>
              {providerModalKey && providerTotals[providerModalKey] ? (
                <Box>
                  {providerTotals[providerModalKey].items.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="success.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                        Items cotizados ({providerTotals[providerModalKey].items.length})
                      </Typography>
                      {providerTotals[providerModalKey].items.map((row, idx) => {
                        const matchPercent = Math.round(row.relevance * 100)
                        const originalName = row.item.item.detalle || row.item.item.item_original
                        const lineTotal = row.price * row.item.quantity
                        return (
                          <Accordion key={idx} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {originalName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Cantidad: {row.item.quantity}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip
                                    label={`${matchPercent}%`}
                                    size="small"
                                    color={matchPercent >= 70 ? 'success' : 'warning'}
                                    variant="outlined"
                                  />
                                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 100, textAlign: 'right' }}>
                                    {formatCLP(lineTotal)}
                                  </Typography>
                                </Box>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Producto encontrado:
                                  </Typography>
                                  <Typography variant="body2">
                                    {row.url ? (
                                      <Link href={row.url} target="_blank" rel="noopener noreferrer">
                                        {row.title || originalName} <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
                                      </Link>
                                    ) : (
                                      row.title || originalName
                                    )}
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Precio unitario:
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {formatCLP(row.price)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Cantidad:
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {row.item.quantity}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Total línea:
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {formatCLP(lineTotal)}
                                  </Typography>
                                </Box>
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        )
                      })}
                    </Box>
                  )}

                  {providerTotals[providerModalKey].lowMatchItems.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="warning.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningAmberIcon sx={{ fontSize: 18 }} />
                        Items con baja coincidencia ({providerTotals[providerModalKey].lowMatchItems.length})
                      </Typography>
                      <Alert severity="warning" sx={{ mb: 1, fontSize: '0.875rem' }}>
                        Estos items tienen coincidencia menor al 40% y no se incluyen en el total.
                      </Alert>
                      {providerTotals[providerModalKey].lowMatchItems.map((row, idx) => {
                        const matchPercent = Math.round(row.relevance * 100)
                        const originalName = row.item.item.detalle || row.item.item.item_original
                        const lineTotal = row.price * row.item.quantity
                        return (
                          <Accordion key={idx} sx={{ mb: 1, bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.light' }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {originalName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Cantidad: {row.item.quantity}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip
                                    label={`${matchPercent}%`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                  />
                                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100, textAlign: 'right' }}>
                                    {formatCLP(lineTotal)}
                                  </Typography>
                                </Box>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Producto encontrado (baja coincidencia):
                                  </Typography>
                                  <Typography variant="body2">
                                    {row.url ? (
                                      <Link href={row.url} target="_blank" rel="noopener noreferrer">
                                        {row.title || originalName} <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
                                      </Link>
                                    ) : (
                                      row.title || originalName
                                    )}
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Precio unitario:
                                  </Typography>
                                  <Typography variant="body2">
                                    {formatCLP(row.price)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Cantidad:
                                  </Typography>
                                  <Typography variant="body2">
                                    {row.item.quantity}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Total línea (no incluido):
                                  </Typography>
                                  <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>
                                    {formatCLP(lineTotal)}
                                  </Typography>
                                </Box>
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        )
                      })}
                    </Box>
                  )}

                  {providerTotals[providerModalKey].missingItems.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} color="error.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningAmberIcon sx={{ fontSize: 18 }} />
                        Items sin cotizar ({providerTotals[providerModalKey].missingItems.length})
                      </Typography>
                      <Alert severity="error" sx={{ mb: 1, fontSize: '0.875rem' }}>
                        Estos items no fueron encontrados en este proveedor.
                      </Alert>
                      {providerTotals[providerModalKey].missingItems.map((row, idx) => {
                        const originalName = row.item.item.detalle || row.item.item.item_original
                        return (
                          <Box key={idx} sx={{ mb: 1, p: 1.5, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {originalName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              Cantidad: {row.item.quantity}
                            </Typography>
                            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                              {row.reason}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>
                  )}

                  {providerTotals[providerModalKey].items.length === 0 && 
                   providerTotals[providerModalKey].lowMatchItems.length === 0 && 
                   providerTotals[providerModalKey].missingItems.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No hay items para este proveedor.
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay información disponible para este proveedor.
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setProviderModalOpen(false)}>Cerrar</Button>
            </DialogActions>
          </Dialog>

          <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Resumen de cotización
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>Subtotal (ítems con precio)</Typography>
                <Typography fontWeight={600}>{formatCLP(subtotal)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography color="text.primary">Ítems cotizados (con precio)</Typography>
                <Typography fontWeight={500}>{itemsConPrecio}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography color="text.primary">Ítems pendientes / no encontrados</Typography>
                <Typography fontWeight={500} color="warning.main">{itemsPendientes}</Typography>
              </Box>
            </Box>
            {pendientes.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }} color="text.primary">
                  Pendientes:
                </Typography>
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    pl: 2.5,
                    pr: 2,
                    py: 1.5,
                    borderLeft: '3px solid',
                    borderColor: 'warning.main',
                    bgcolor: (t) => t.palette.mode === 'light' ? 'grey.100' : 'grey.800',
                    borderRadius: 1,
                  }}
                >
                  {pendientes.map((r, i) => (
                    <Box component="li" key={i} sx={{ mb: 0.5 }}>
                      <Typography variant="body2">
                        {r.item.detalle || r.item.item_original}
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem', ml: 0.5 }}>
                          — {pendingReason(r)}
                        </Box>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </>
      )}

      {quoted && (
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={onReset}>
            Nueva cotización
          </Button>
          <Button 
            variant="contained" 
            color="success"
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialogOpen(true)}
          >
            Guardar cotización
          </Button>
        </Box>
      )}

      <QuoteProgressModal
        open={showProgress}
        items={workingItems}
        quotedCount={quotedCount}
        sources={sources}
        indeterminate={batchMode}
        onEditItem={handleEditItem}
        onRetryItem={handleRetryItem}
        onClose={() => setShowProgress(false)}
      />

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Guardar cotización</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Nombre de la cotización"
            fullWidth
            value={quoteTitle}
            onChange={(e) => setQuoteTitle(e.target.value)}
            placeholder="Ej: Cotización Colegio 1, Útiles Marzo 2026"
            autoFocus
            disabled={saving}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && quoteTitle.trim()) {
                handleSaveQuote()
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Usa un nombre descriptivo para identificar esta cotización fácilmente después
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveQuote} 
            variant="contained" 
            color="success"
            disabled={!quoteTitle.trim() || saving}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}