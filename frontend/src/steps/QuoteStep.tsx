import { useCallback, useState, useMemo } from 'react'
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
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket'
import type { ItemQuote, SourceId } from '../types'
import { formatCLP } from '../utils/format'
import { quoteMultiProviders } from '../api'
import { QuoteProgressModal } from '../components/QuoteProgressModal'

type Props = {
  results: ItemQuote[]
  onReset: () => void
  sources: SourceId[]
}

const FOUND_STATUSES = ['ok', 'ok_with_price']

function isFound(q: { status?: string } | undefined): boolean {
  return !!q && FOUND_STATUSES.includes(q.status || '')
}

export function QuoteStep({ results, onReset, sources }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoted, setQuoted] = useState(false)
  const [quotedResults, setQuotedResults] = useState<ItemQuote[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showProgress, setShowProgress] = useState(false)
  const [quotedCount, setQuotedCount] = useState(0)
  const [workingItems, setWorkingItems] = useState<ItemQuote[]>([])

  const handleQuote = useCallback(async () => {
    if (!results.length) return
    
    setLoading(true)
    setError(null)
    setShowProgress(true)
    setQuotedCount(0)
    setWorkingItems(results)
    
    try {
      const updated: ItemQuote[] = []
      let count = 0
      
      for (const item of results) {
        try {
          const query = item.item.detalle || item.item.item_original
          const quote = await quoteMultiProviders(query, sources, item.quantity)
          updated.push({
            item: item.item,
            quantity: item.quantity,
            multi: quote,
          })
        } catch (e) {
          // Keep original item if quote fails
          updated.push(item)
        }
        
        count += 1
        setQuotedCount(count)
      }
      
      setQuotedResults(updated)
      setQuoted(true)
      setShowProgress(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cotizar')
      setShowProgress(false)
    } finally {
      setLoading(false)
    }
  }, [results, sources])

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
      const quote = await quoteMultiProviders(query, sources, item.quantity)
      
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
  
  const { subtotal, itemsConPrecio, itemsPendientes, pendientes, byProvider } = useMemo(() => {
    let sub = 0
    let conPrecio = 0
    const pen: ItemQuote[] = []
    const providerMap: Record<string, { name: string; items: Array<{ item: ItemQuote; price: number }> }> = {}

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
        if (provider) {
          if (!providerMap[provider]) {
            providerMap[provider] = { name: getProviderName(provider), items: [] }
          }
          providerMap[provider].items.push({ item: r, price: unit })
        }
      } else {
        pen.push(r)
      }
    }

    return {
      subtotal: sub,
      itemsConPrecio: conPrecio,
      itemsPendientes: pen.length,
      pendientes: pen,
      byProvider: providerMap,
    }
  }, [displayResults])

  const providerTotals = useMemo(() => {
    const providers = sources
    const totals: Record<string, { name: string; total: number; found: number; missing: number }> = {}

    for (const p of providers) {
      totals[p] = { name: getProviderName(p), total: 0, found: 0, missing: 0 }
    }

    for (const r of displayResults) {
      const q = r.multi || r.dimeiggs
      const hits = (q as any)?.hits || []
      const qty = r.quantity

      for (const p of providers) {
        const providerHits = hits.filter((h: any) => h?.provider === p && h?.price != null)
        let bestPrice: number | null = null

        if (providerHits.length) {
          bestPrice = providerHits.reduce((min: number | null, h: any) => {
            const price = Number(h.price)
            if (Number.isNaN(price)) return min
            return min == null ? price : Math.min(min, price)
          }, null)
        } else if ((q as any)?.provider === p && (q as any)?.unit_price != null) {
          bestPrice = Number((q as any).unit_price)
        }

        if (bestPrice != null && !Number.isNaN(bestPrice)) {
          totals[p].total += bestPrice * qty
          totals[p].found += 1
        } else {
          totals[p].missing += 1
        }
      }
    }

    return totals
  }, [displayResults, sources])

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

  const getSelectedItemsForProvider = (providerKey: string) => {
    const selected: Array<{ itemIndex: number; itemData: ItemQuote; hitIndex: number; hit: any }> = []
    displayResults.forEach((item, itemIdx) => {
      const q = item.multi || item.dimeiggs
      const hits = (q as any)?.hits || []
      hits.forEach((hit: any, hitIdx: number) => {
        if (hit.provider === providerKey && isItemSelected(itemIdx, hitIdx)) {
          selected.push({ itemIndex: itemIdx, itemData: item, hitIndex: hitIdx, hit })
        }
      })
    })
    return selected
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
        {!quoted ? 'Artículos seleccionados' : `Resultados de cotización ${isMultiProvider && '(Multi-tienda)'}`}
      </Typography>

      {!quoted ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {results.length} artículos listos para cotizar en {sources.length} {sources.length === 1 ? 'tienda' : 'tiendas'}.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => window.history.back()}>
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
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 56 }} />
                  <TableCell>Detalle</TableCell>
                  <TableCell align="center" sx={{ width: 90 }}>Cantidad</TableCell>
                  <TableCell align="center" sx={{ width: 120 }}>Proveedor</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>Precio unit.</TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>Total línea</TableCell>
                  <TableCell align="center" sx={{ width: 130 }}>Estado</TableCell>
                  <TableCell align="center" sx={{ width: 180 }}>Producto seleccionado</TableCell>
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
                          <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label="Cotizado"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
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

          {isMultiProvider && Object.keys(byProvider).length > 0 && (
            <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📦 Resumen por Proveedor
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {Object.entries(byProvider).map(([providerKey, providerData]) => {
                  const subtotalByProvider = providerData.items.reduce((sum, item) => sum + (item.price * item.item.quantity), 0)
                  const totalItems = providerData.items.length
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
                        bgcolor: (t) => t.palette.mode === 'light' ? '#f5f5f5' : '#1e1e1e',
                        borderLeft: `4px solid ${getProviderColor(providerKey)}`,
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 2 }
                      }}
                    >
                      <Typography 
                        variant="subtitle1" 
                        fontWeight={700} 
                        sx={{ mb: 1.5, color: getProviderColor(providerKey) }}
                      >
                        {providerData.name}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                        {providerData.items.map((item, i) => {
                          const selectedForProvider = getSelectedItemsForProvider(providerKey)
                          const isSelected = selectedForProvider.some(sel => sel.itemData === item.item)
                          return (
                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {item.item.item.detalle || item.item.item.item_original}
                                  </Typography>
                                  {isSelected && (
                                    <Chip
                                      icon={<ShoppingBasketIcon />}
                                      label="Comprado"
                                      size="small"
                                      variant="filled"
                                      sx={{ height: 20, bgcolor: getProviderColor(providerKey), color: 'white' }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  × {item.item.quantity}
                                </Typography>
                              </Box>
                              <Typography variant="body2" fontWeight={600}>
                                {formatCLP(item.price * item.item.quantity)}
                              </Typography>
                            </Box>
                          )
                        })}
                      </Box>
                      <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" fontWeight={700}>
                            Subtotal:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            fontWeight={700} 
                            sx={{ fontSize: '1.1rem', color: getProviderColor(providerKey) }}
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
                              bgcolor: getProviderColor(providerKey),
                              '&:hover': { opacity: 0.9 }
                            }}
                          >
                            Ir a tienda
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
                    <TableRow>
                      <TableCell>Proveedor</TableCell>
                      <TableCell align="center">Ítems con precio</TableCell>
                      <TableCell align="center">Ítems sin precio</TableCell>
                      <TableCell align="right">Total estimado</TableCell>
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
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

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
                <Typography color="text.secondary">Ítems cotizados (con precio)</Typography>
                <Typography fontWeight={500}>{itemsConPrecio}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography color="text.secondary">Ítems pendientes / no encontrados</Typography>
                <Typography fontWeight={500} color="warning.main">{itemsPendientes}</Typography>
              </Box>
            </Box>
            {pendientes.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }} color="text.secondary">
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
        <Box sx={{ mt: 4 }}>
          <Button variant="contained" onClick={onReset}>
            Nueva cotización
          </Button>
        </Box>
      )}

      <QuoteProgressModal
        open={showProgress}
        items={workingItems}
        quotedCount={quotedCount}
        sources={sources}
        onEditItem={handleEditItem}
        onRetryItem={handleRetryItem}
        onClose={() => setShowProgress(false)}
      />
    </Box>
  )
}