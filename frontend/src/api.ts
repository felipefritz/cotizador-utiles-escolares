const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Helper para obtener el token
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    }
  }
  return {}
}

export type ParsedItem = {
  item_original: string
  detalle: string
  cantidad: number | null
  unidad: string | null
  asignatura: string | null
  tipo: 'util' | 'lectura'
  confianza?: number
}

export type ParseResponse = {
  raw_text_preview: string
  lines_count: number
  items: ParsedItem[]
  dubious_sent_to_ai?: number
}

export type QuoteHit = {
  title: string
  brand?: string | null
  url: string
  sku?: string | null
  score?: number | null
  price?: number | null
  image_url?: string | null  // <-- NUEVO: URL de la imagen
  provider?: string  // <-- NUEVO: Identificar proveedor (dimeiggs, libreria_nacional, etc)
  available?: boolean
  relevance?: number
}

export type QuoteResponse = {
  query: string
  status: 'ok' | 'ok_with_price' | 'not_found' | 'error' | 'no_match' | 'no_price' | 'skip'
  hits: QuoteHit[]
  error: string | null
  unit_price?: number | null
  line_total?: number | null
  reason?: string
  image_url?: string | null
}

export type ParseAiQuoteResume = {
  items_total: number
  items_priced: number
  items_missing: number
  total_items_qty: number
  subtotal: number
  currency: string
}

export type ItemWithQuote = ParsedItem & { quote?: QuoteResponse }

export type ParseAiQuoteResponse = {
  raw_text_preview?: string
  lines_count: number
  dubious_sent_to_ai?: number
  resume: ParseAiQuoteResume
  items: ItemWithQuote[]
  llm_error?: string | null
}

export async function parseFile(file: File, useAi = true): Promise<ParseResponse> {
  const form = new FormData()
  form.append('file', file)
  const url = useAi ? `${API_BASE}/parse-ai?quote=false` : `${API_BASE}/parse`
  const res = await fetch(url, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

/** Parsea el archivo SIN cotizar. Solo devuelve items para editar. */
export async function parseAiItemsOnly(file: File): Promise<ParseResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/parse-ai-items-only`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text || `Error ${res.status}`
    try {
      const j = JSON.parse(text) as { detail?: string; type?: string; traceback?: string }
      if (j.detail) msg = `[${j.type || 'Error'}] ${j.detail}`
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json()
}

/** Parsea el archivo usando SOLO IA (sin parser de reglas). Devuelve items para editar. */
export async function parseAiFull(file: File): Promise<ParseResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/parse-ai-full`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text || `Error ${res.status}`
    try {
      const j = JSON.parse(text) as { detail?: string; type?: string; traceback?: string }
      if (j.detail) msg = `[${j.type || 'Error'}] ${j.detail}`
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json()
}

/** Parsea + cotiza en Dimeiggs en una sola petición. Incluye precios (unit_price, line_total) cuando están disponibles. */
export async function parseAiQuoteDimeiggs(file: File): Promise<ParseAiQuoteResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/parse-ai-quote/dimeiggs`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text || `Error ${res.status}`
    try {
      const j = JSON.parse(text) as { detail?: string; type?: string; traceback?: string }
      if (j.detail) msg = `[${j.type || 'Error'}] ${j.detail}`
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json()
}

export async function quoteDimeiggs(query: string): Promise<QuoteResponse> {
  const res = await fetch(`${API_BASE}/quote/dimeiggs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim() }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

// ============ NUEVOS: MULTI-PROVEEDOR ============

export type MultiProviderHit = {
  title: string
  url: string
  price: number | null
  available: boolean
  provider: 'dimeiggs' | 'libreria_nacional' | 'jamila' | 'coloranimal' | 'pronobel' | 'prisa' | 'lasecretaria'
  relevance: number
}

export type MultiProviderResponse = {
  query: string
  status: 'ok' | 'partial' | 'no_results' | 'error'
  providers_queried: string[]
  providers_failed: Array<[string, string]>
  hits: MultiProviderHit[]
  error: string | null
}

export type ParseAiQuoteMultiResponse = ParseAiQuoteResponse & {
  resume: ParseAiQuoteResume & { providers_used: string[] }
}

/**
 * Busca un producto en múltiples retailers (Dimeiggs, Jumbo, Lider, Lápiz López)
 * Retorna resultados consolidados ordenados por relevancia + precio
 */
export async function quoteMultiProviders(
  query: string,
  providers?: string[],
  limitPerProvider?: number,
): Promise<MultiProviderResponse> {
  const res = await fetch(`${API_BASE}/quote/multi-providers`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      query: query.trim(),
      providers: providers || ['dimeiggs', 'libreria_nacional', 'jamila', 'coloranimal', 'pronobel', 'prisa', 'lasecretaria'],
      limit_per_provider: limitPerProvider || 5,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

/**
 * Parsea + IA + Cotización Multi-Proveedor en una sola petición
 * Busca en Dimeiggs, Librería Nacional, Jamila, Coloranimal, Pronobel, Prisa y La Secretaria simultáneamente
 */
export async function parseAiQuoteMultiProviders(
  file: File,
  providers?: string,
): Promise<ParseAiQuoteMultiResponse> {
  const form = new FormData()
  form.append('file', file)
  
  const url = new URL(`${API_BASE}/parse-ai-quote/multi-providers`, window.location.origin)
  if (providers) {
    url.searchParams.append('providers', providers)
  }
  
  const res = await fetch(url.toString(), {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text || `Error ${res.status}`
    try {
      const j = JSON.parse(text) as { detail?: string; type?: string }
      if (j.detail) msg = `[${j.type || 'Error'}] ${j.detail}`
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json()
}
