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

  const selectedCount = useMemo(() => items.filter((i) => i.selected).length, [items])

  // Si max_items es null/undefined = ilimitado, usar items.length
  // Si max_items es un número (incluso 0), respetar ese límite
  const maxItems = limits?.limits.max_items !== null && limits?.limits.max_items !== undefined 
    ? limits.limits.max_items 
    : (items.length > 0 ? items.length : 999)
  
  console.log('[ItemsStep] maxItems calculado:', maxItems, 'items.length:', items.length, 'selectedCount:', selectedCount)

  // Auto-limitar items seleccionados cuando se cargan los límites
  useEffect(() => {
    if (!limits || loadingLimits) return
    
    const selectedItems = items.filter(i => i.selected)
    if (selectedItems.length > maxItems) {
      console.log(`[ItemsStep] ⚠️ Limitando selección: ${selectedItems.length} → ${maxItems}`)
      
      // Deseleccionar items que excedan el límite (mantener solo los primeros maxItems)
      let count = 0
      const limitedItems = items.map(item => {
        if (item.selected && item.item.tipo !== 'lectura') {
          count++
          if (count > maxItems) {
            return { ...item, selected: false }
          }
        }
        return item
      })
      
      onItemsChange(limitedItems)
    }
  }, [limits, loadingLimits, maxItems])

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
        tipo: 'util',
      },
      selected: true,
      quantity: qty,
    }

    let nextItems = [...items]
    if (selectedCount >= maxItems && maxItems > 0) {
      for (let i = nextItems.length - 1; i >= 0; i -= 1) {
        if (nextItems[i].selected && nextItems[i].item.tipo !== 'lectura') {
          nextItems[i] = { ...nextItems[i], selected: false }
          setAddNotice('Se deselecciono el item mas reciente para respetar el limite.')
          break
        }
      }
    } else {
      setAddNotice(null)
    }

    nextItems = [...nextItems, nextItem]
    onItemsChange(nextItems)
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
    // Contar solo items que pueden seleccionarse (no son "lectura")
    const selectableItems = items.filter(i => i.item.tipo !== 'lectura')
    const selectableSelected = items.filter(i => i.selected && i.item.tipo !== 'lectura').length
    
    // Si todos los seleccionables están seleccionados → deseleccionar todos
    // Si no todos están seleccionados → seleccionar hasta el límite
    const shouldSelectAll = selectableSelected < selectableItems.length
    
    if (shouldSelectAll) {
      // Seleccionar hasta maxItems (respetando el límite)
      let count = 0
      const updated = items.map(i => {
        if (i.item.tipo === 'lectura') {
          return i // Items lectura siempre sin seleccionar
        }
        if (!i.selected && count < maxItems) {
          count++
          return { ...i, selected: true }
        }
        return i
      })
      onItemsChange(updated)
    } else {
      // Deseleccionar todos
      onItemsChange(items.map((i) => ({ ...i, selected: false })))
    }
  }

  const canProceed = selectedCount > 0

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
                  indeterminate={selectedCount > 0 && selectedCount < maxItems}
                  checked={selectedCount === maxItems && maxItems > 0}
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
              const isDisabled = row.item.tipo === 'lectura' || (!row.selected && selectedCount >= maxItems);
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
