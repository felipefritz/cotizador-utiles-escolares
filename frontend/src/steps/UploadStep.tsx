import { useCallback, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  alpha,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tooltip,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SpeedIcon from '@mui/icons-material/Speed'
import { parseAiItemsOnly, parseAiFull, type ParsedItem } from '../api'
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
  const [extractionMethod, setExtractionMethod] = useState<'hybrid' | 'ai'>('hybrid')

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
      const data = extractionMethod === 'ai' 
        ? await parseAiFull(f)
        : await parseAiItemsOnly(f)
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

      {/* Selector de método de extracción */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          Método de extracción
        </Typography>
        <RadioGroup
          value={extractionMethod}
          onChange={(e) => setExtractionMethod(e.target.value as 'hybrid' | 'ai')}
        >
          <Tooltip title="Más rápido. Usa reglas de texto + IA para casos dudosos" placement="right">
            <FormControlLabel 
              value="hybrid" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SpeedIcon fontSize="small" />
                  <span>Híbrido (Reglas + IA)</span>
                </Box>
              }
              disabled={loading}
            />
          </Tooltip>
          <Tooltip title="Más preciso para archivos complejos. Usa IA completamente (puede tomar 1-2 minutos)" placement="right">
            <FormControlLabel 
              value="ai" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon fontSize="small" />
                  <span>IA Completa (Recomendado)</span>
                </Box>
              }
              disabled={loading}
            />
          </Tooltip>
        </RadioGroup>
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
              {extractionMethod === 'ai' 
                ? 'IA está analizando el archivo... esto puede tomar 1-2 minutos'
                : 'Analizando lista…'
              }
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
