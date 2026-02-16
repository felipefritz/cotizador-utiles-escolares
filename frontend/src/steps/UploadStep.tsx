import { useCallback, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  alpha,
  Button,
  TextField,
  Divider,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { parseAiFull, type ParsedItem } from '../api'
import type { SourceId } from '../types'

const ACCEPT = '.pdf,.docx,.xlsx,.xls'

type Props = {
  onItemsParsed: (items: ParsedItem[]) => void
  sources: SourceId[]
  onBack: () => void
}

export function UploadStep({ onItemsParsed, sources, onBack }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [parsed, setParsed] = useState(false)
  const extractionMethod: 'ai' = 'ai'
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState(1)
  const [manualItems, setManualItems] = useState<ParsedItem[]>([])

  const upload = useCallback(async (f: File) => {
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'))
    if (!['.pdf', '.docx', '.xlsx', '.xls'].includes(ext)) {
      setError('Formato no soportado. Use PDF, DOCX, XLS o XLSX.')
      return
    }
    setError(null)
    setFile(f)
    setLoading(true)
    try {
      const data = await parseAiFull(f)
      onItemsParsed(data.items)
      setParsed(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el archivo.')
    } finally {
      setLoading(false)
    }
  }, [onItemsParsed, extractionMethod])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) upload(f)
  }, [upload])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDrag(true)
  }, [])

  const onDragLeave = useCallback(() => setDrag(false), [])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) upload(f)
  }, [upload])

  const addManualItem = () => {
    const name = manualName.trim()
    if (!name) return
    const qty = Math.max(1, Math.min(999, Math.floor(manualQty) || 1))
    const next: ParsedItem = {
      item_original: name,
      detalle: name,
      cantidad: qty,
      unidad: null,
      asignatura: null,
      tipo: 'util',
    }
    setManualItems((prev) => [...prev, next])
    setManualName('')
    setManualQty(1)
  }

  const continueWithManualItems = () => {
    if (manualItems.length === 0) return
    onItemsParsed(manualItems)
    setManualItems([])
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
        Sube tu lista de útiles en PDF, DOCX, XLS o XLSX
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: 3, textAlign: 'center' }}>
        Cotizaremos en: {sources.map(s => {
          const names: Record<SourceId, string> = {
            dimeiggs: 'Dimeiggs',
            libreria_nacional: 'Librería Nacional',
            jamila: 'Jamila',
            coloranimal: 'Coloranimal',
            pronobel: 'Pronobel',
            prisa: 'Prisa',
            lasecretaria: 'La Secretaria',
          }
          return names[s]
        }).join(', ')}
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon fontSize="small" />
          Método de extracción: IA Completa
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Usamos IA para mayor precision (puede tomar 1-2 minutos).
        </Typography>
      </Paper>

      <Paper
        variant="outlined"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: loading ? 'wait' : 'pointer',
          border: '2px dashed',
          borderColor: drag ? 'primary.main' : 'divider',
          bgcolor: drag ? (t) => alpha(t.palette.primary.main, 0.04) : 'background.paper',
          '&:hover': loading ? {} : { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
        }}
        onClick={() => !loading && document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          accept={ACCEPT}
          onChange={onInputChange}
          style={{ display: 'none' }}
        />
        {loading ? (
          <Box sx={{ py: 2 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography>
              IA está analizando el archivo... esto puede tomar 1-2 minutos
            </Typography>
          </Box>
        ) : file ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <InsertDriveFileIcon color="primary" />
            <Typography>{file.name}</Typography>
          </Box>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              Arrastra un archivo aquí o haz clic para seleccionar
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              PDF, DOCX, XLS, XLSX
            </Typography>
          </>
        )}
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!file && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            O ingresa items manualmente
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="Nombre del item"
                size="small"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                sx={{ flex: 1, minWidth: 240 }}
              />
              <TextField
                label="Cantidad"
                type="number"
                size="small"
                value={manualQty}
                onChange={(e) => setManualQty(Number(e.target.value))}
                inputProps={{ min: 1, max: 999, style: { width: 80, textAlign: 'center' } }}
              />
              <Button variant="contained" onClick={addManualItem} disabled={!manualName.trim()}>
                Agregar
              </Button>
            </Box>
            {manualItems.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {manualItems.map((item, idx) => (
                  <Typography key={idx} variant="body2" color="text.secondary">
                    {item.detalle} — Cantidad: {item.cantidad || 1}
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>
          <Button
            variant="contained"
            fullWidth
            onClick={continueWithManualItems}
            disabled={manualItems.length === 0}
          >
            Continuar con items manuales
          </Button>
        </>
      )}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={onBack} fullWidth>
          Atrás
        </Button>
        {file && parsed && (
          <Button variant="contained" onClick={() => {}} fullWidth disabled>
            Cargado ✓
          </Button>
        )}
      </Box>
    </Box>
  )
}
