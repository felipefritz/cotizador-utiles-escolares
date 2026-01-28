import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  IconButton,
  Chip,
  Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { ItemQuote, SourceId } from '../types'

type Props = {
  open: boolean
  items: ItemQuote[]
  quotedCount: number
  sources: SourceId[]
  onEditItem?: (index: number, newName: string) => void
  onRetryItem?: (index: number) => void
  onClose: () => void
}

export function QuoteProgressModal({
  open,
  items,
  quotedCount,
  sources,
  onEditItem,
  onRetryItem,
  onClose,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const progress = items.length > 0 ? (quotedCount / items.length) * 100 : 0
  const remaining = items.length - quotedCount

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index)
    setEditValue(currentName)
  }

  const handleSaveEdit = (index: number) => {
    if (editValue.trim()) {
      onEditItem?.(index, editValue.trim())
      setEditingIndex(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditValue('')
  }

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Cotizando productos...</Typography>
          <Chip
            label={`${quotedCount}/${items.length}`}
            size="small"
            color={quotedCount === items.length ? 'success' : 'primary'}
            variant="filled"
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Progreso
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        {remaining > 0 && (
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.875rem' }}>
            ⏱️ Este proceso puede tomar algunos minutos. Por favor espera mientras cotizamos en {sources.length} {sources.length === 1 ? 'tienda' : 'tiendas'}...
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Ítems a cotizar:
        </Typography>

        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {items.map((item, index) => {
            const isQuoted = index < quotedCount
            const isEditing = editingIndex === index

            return (
              <ListItem
                key={index}
                sx={{
                  py: 1.5,
                  px: 0,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  opacity: isQuoted ? 1 : 0.7,
                }}
                secondaryAction={
                  isQuoted && !isEditing && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleStartEdit(
                            index,
                            item.item.detalle || item.item.item_original
                          )
                        }
                        title="Editar nombre"
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onRetryItem?.(index)}
                        title="Volver a cotizar"
                      >
                        <RefreshIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  )
                }
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {isQuoted ? (
                    <CheckCircleIcon
                      sx={{ color: 'success.main', fontSize: 24 }}
                    />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ fontSize: 24 }} />
                  )}
                </ListItemIcon>

                {isEditing ? (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                      flex: 1,
                      mr: 2,
                    }}
                  >
                    <TextField
                      size="small"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      fullWidth
                      autoFocus
                      variant="outlined"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleSaveEdit(index)}
                      color="success"
                    >
                      <SaveIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={handleCancelEdit}
                      color="error"
                    >
                      <CancelIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isQuoted ? 500 : 400,
                          textDecoration: isQuoted ? 'line-through' : 'none',
                        }}
                      >
                        {item.item.detalle || item.item.item_original}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        Cantidad: {item.quantity}
                      </Typography>
                    }
                  />
                )}
              </ListItem>
            )
          })}
        </List>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={onClose} 
          variant="contained" 
          disabled={remaining > 0}
          color={remaining > 0 ? 'inherit' : 'success'}
        >
          {remaining > 0 ? `Esperando... (${remaining} restantes)` : 'Terminar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
