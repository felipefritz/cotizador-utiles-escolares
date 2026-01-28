import { useMemo } from 'react'
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
} from '@mui/material'
import type { SelectedItem } from '../types'

type Props = {
  items: SelectedItem[]
  onItemsChange: (items: SelectedItem[]) => void
  onNext: () => void
  onBack: () => void
}

export function ItemsStep({ items, onItemsChange, onNext, onBack }: Props) {
  const selectedCount = useMemo(() => items.filter((i) => i.selected).length, [items])

  const toggle = (index: number) => {
    const next = [...items]
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

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
        Marca los útiles que quieres cotizar y ajusta la cantidad
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedCount > 0 && selectedCount < items.length}
                  checked={items.length > 0 && selectedCount === items.length}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell>Detalle</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>
                Cantidad
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row, idx) => (
              <TableRow key={idx} hover selected={row.selected}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={row.selected}
                    onChange={() => toggle(idx)}
                    disabled={row.item.tipo === 'lectura'}
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
            ))}
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
