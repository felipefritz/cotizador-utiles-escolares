import { useMemo, useEffect, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  TableFooter,
  Alert,
  CircularProgress,
} from '@mui/material'
import { api } from '../api'
import type { SelectedItem } from '../types'

interface UserLimits {
  limits: {
    max_items: number
  }
}

type Props = {
  items: SelectedItem[]
  onItemsChange: (items: SelectedItem[]) => void
  onNext: () => void
  onBack: () => void
}

export function ItemsStep({ items, onItemsChange, onNext, onBack }: Props) {
  const [limits, setLimits] = useState<UserLimits | null>(null)
  const [loadingLimits, setLoadingLimits] = useState(true)

  // Cargar límites del usuario
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/user/limits')
        setLimits(response.data)
      } catch (error) {
        console.log('No se pudieron cargar límites:', error)
      } finally {
        setLoadingLimits(false)
      }
    }
    fetchLimits()
  }, [])

  const maxItems = limits?.limits.max_items || items.length
  const selectedCount = useMemo(() => items.filter((i) => i.selected).length, [items])
  const canSelectMore = selectedCount < maxItems

  const toggle = (index: number) => {
    const next = [...items]
    const isCurrentlySelected = next[index].selected
    
    // Solo permitir seleccionar si no ha alcanzado el límite O si ya estaba seleccionado (para deseleccionar)
    if (!isCurrentlySelected && selectedCount >= maxItems) {
      return
    }
    
    next[index] = { ...next[index], selected: !next[index].selected }
    onItemsChange(next)
  }

  const setQuantity = (index: number, qty: number) => {
    const v = Math.max(1, Math.min(999, Math.floor(qty) || 1))
    const next = [...items]
    next[index] = { ...next[index], quantity: v }
    onItemsChange(next)
  }

  const toggleAll = () => {
    const all = selectedCount === items.length
    onItemsChange(items.map((i) => ({ ...i, selected: !all })))
  }

  const canProceed = selectedCount > 0

  if (items.length === 0) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No se detectaron ítems en la lista. Prueba con otro archivo.
        </Typography>
      </Box>
    )
  }

  if (loadingLimits) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', textAlign: 'center', py: 4 }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
        Marca los útiles que quieres cotizar y ajusta la cantidad
      </Typography>

      {items.length > maxItems && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tu plan permite cotizar máximo <strong>{maxItems} items</strong> por cotización. Se detectaron {items.length} items. Solo podrás seleccionar {maxItems}.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedCount > 0 && selectedCount < items.length}
                  checked={items.length > 0 && selectedCount === items.length}
                  onChange={toggleAll}
                  disabled={items.length > maxItems && selectedCount === 0}
                />
              </TableCell>
              <TableCell>Detalle</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>
                Cantidad
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row, idx) => {
              const isDisabled = row.item.tipo === 'lectura' || (!row.selected && selectedCount >= maxItems);
              return (
                <TableRow key={idx} hover selected={row.selected} sx={{ opacity: isDisabled ? 0.6 : 1 }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={row.selected}
                      onChange={() => toggle(idx)}
                      disabled={isDisabled}
                      title={isDisabled && !row.selected ? `Máximo ${maxItems} items permitidos` : ''}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.item.detalle || row.item.item_original}</Typography>
                    {row.item.asignatura && (
                      <Typography variant="caption" color="text.secondary">
                        {row.item.asignatura}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={row.quantity}
                      onChange={(e) => setQuantity(idx, Number(e.target.value))}
                      inputProps={{ min: 1, max: 999, style: { width: 56, textAlign: 'center' } }}
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: 14 } }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary">
                  {selectedCount} de {items.length} seleccionados para cotizar. Los ítems tipo «lectura» no se cotizan.
                </Typography>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={onBack}>
          Atrás
        </Button>
        <Button variant="contained" onClick={onNext} disabled={!canProceed}>
          Siguiente: Cotizar
        </Button>
      </Box>
    </Box>
  )
}
