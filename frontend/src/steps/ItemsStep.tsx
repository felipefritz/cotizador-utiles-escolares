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
  IconButton,
  Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import { api } from '../api'
import type { SelectedItem } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { appendItem, countSelected, isAtLimit, selectAllTarget, selectUpToLimit, trimToLimit } from './itemSelection'

interface UserLimits {
  plan: string
  limits: {
    max_items: number | null
  }
}

type Props = {
  items: SelectedItem[]
  onItemsChange: (items: SelectedItem[]) => void
  onNext: () => void
  onBack: () => void
}

export function ItemsStep({ items, onItemsChange, onNext, onBack }: Props) {
  const { token } = useAuth()
  const [limits, setLimits] = useState<UserLimits | null>(null)
  const [loadingLimits, setLoadingLimits] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState(1)
  const [addNotice, setAddNotice] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  // Cargar límites del usuario
  useEffect(() => {
    const fetchLimits = async () => {
      if (!token) {
        setLimits(null)
        setLoadingLimits(false)
        return
      }
      try {
        const response = await api.get('/user/limits')
        console.log('[ItemsStep] Límites recibidos:', response.data)
        console.log('[ItemsStep] max_items:', response.data?.limits?.max_items)
        setLimits(response.data)
      } catch (error) {
        console.log('No se pudieron cargar límites:', error)
      } finally {
        setLoadingLimits(false)
      }
    }
    fetchLimits()
  }, [token])

  const selectedCount = useMemo(() => countSelected(items), [items])

  // null = sin límite (sin sesión, plan ilimitado o planes desactivados).
  const maxItems: number | null = limits?.limits.max_items ?? null
  const atLimit = isAtLimit(selectedCount, maxItems)
  const allTarget = selectAllTarget(items, maxItems)

  // Al cargar los límites, desmarcar lo que exceda el plan.
  useEffect(() => {
    if (loadingLimits || maxItems === null) return
    if (countSelected(items) > maxItems) {
      onItemsChange(trimToLimit(items, maxItems))
    }
  }, [limits, loadingLimits, maxItems])

  const toggle = (index: number) => {
    const next = [...items]
    const isCurrentlySelected = next[index].selected

    // Se puede desmarcar siempre; marcar, solo si queda cupo en el plan.
    if (!isCurrentlySelected && atLimit) {
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

  const addManualItem = () => {
    const name = newItemName.trim()
    if (!name) return

    const qty = Math.max(1, Math.min(999, Math.floor(newItemQty) || 1))
    const nextItem: SelectedItem = {
      item: {
        item_original: name,
        detalle: name,
        cantidad: qty,
        unidad: null,
        asignatura: null,
        tipo: 'producto',
      },
      selected: true,
      quantity: qty,
    }

    const result = appendItem(items, nextItem, maxItems)
    setAddNotice(
      result.deselected
        ? `Tu plan permite ${maxItems} ítems por cotización: se desmarcó el último ítem marcado para incluir el nuevo.`
        : null,
    )
    onItemsChange(result.items)
    setNewItemName('')
    setNewItemQty(1)
  }

  const startEdit = (index: number, currentName: string) => {
    setEditingIndex(index)
    setEditValue(currentName)
  }

  const saveEdit = (index: number) => {
    const name = editValue.trim()
    if (!name) return
    const next = [...items]
    next[index] = {
      ...next[index],
      item: {
        ...next[index].item,
        detalle: name,
        item_original: name,
      },
    }
    onItemsChange(next)
    setEditingIndex(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditValue('')
  }

  const deleteItem = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    onItemsChange(next)
  }

  const toggleAll = () => {
    // Si ya está marcado todo lo que permite el plan, se desmarca todo.
    if (selectedCount < allTarget) {
      onItemsChange(selectUpToLimit(items, maxItems))
    } else {
      onItemsChange(items.map((i) => ({ ...i, selected: false })))
    }
  }

  const canProceed = selectedCount > 0
  const isFreePlan = limits?.plan === 'free'

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
        Marca los productos que quieres cotizar y ajusta la cantidad
      </Typography>

      {isFreePlan && maxItems !== null && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Plan Gratis:</strong> no se cotiza automáticamente toda una lista extensa. Puedes incluir
          hasta <strong>{maxItems} productos por cotización</strong>. Los demás productos permanecen visibles,
          pero quedan fuera de la búsqueda hasta que los selecciones en otra cotización o actualices tu plan.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Agregar item manualmente
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Nombre del item"
            size="small"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addManualItem()
            }}
            sx={{ flex: 1, minWidth: 240 }}
          />
          <TextField
            label="Cantidad"
            type="number"
            size="small"
            value={newItemQty}
            onChange={(e) => setNewItemQty(Number(e.target.value))}
            inputProps={{ min: 1, max: 999, style: { width: 80, textAlign: 'center' } }}
          />
          <Button variant="contained" onClick={addManualItem} disabled={!newItemName.trim()}>
            Agregar
          </Button>
        </Box>
        {addNotice && (
          <Alert severity="info" sx={{ mt: 2 }} onClose={() => setAddNotice(null)}>
            {addNotice}
          </Alert>
        )}
      </Paper>

      {maxItems !== null && items.length > maxItems && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tu plan permite cotizar máximo <strong>{maxItems} items</strong> por cotización. Se detectaron {items.length} items. Solo podrás seleccionar {maxItems}.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedCount > 0 && selectedCount < allTarget}
                  checked={allTarget > 0 && selectedCount >= allTarget}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell>Detalle</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>
                Cantidad
              </TableCell>
              <TableCell align="right" sx={{ width: 110 }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    Aun no hay items. Puedes agregarlos manualmente arriba.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((row, idx) => {
              const isDisabled = row.item.tipo === 'lectura' || (!row.selected && atLimit)
              const isEditing = editingIndex === idx
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
                    {isEditing ? (
                      <TextField
                        size="small"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        fullWidth
                      />
                    ) : (
                      <Typography variant="body2">{row.item.detalle || row.item.item_original}</Typography>
                    )}
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
                  <TableCell align="right">
                    {isEditing ? (
                      <>
                        <Tooltip title="Guardar">
                          <IconButton size="small" onClick={() => saveEdit(idx)}>
                            <SaveIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancelar">
                          <IconButton size="small" onClick={cancelEdit}>
                            <CancelIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEdit(idx, row.item.detalle || row.item.item_original)}>
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => deleteItem(idx)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary">
                  {selectedCount} de {items.length} seleccionados para cotizar. Las lecturas detectadas en listas escolares quedan fuera de la cotización.
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
