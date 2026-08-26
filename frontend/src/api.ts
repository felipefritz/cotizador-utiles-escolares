export const API_BASE = import.meta.env.VITE_API_URL || '/api'

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
  tipo: 'producto' | 'servicio' | 'util' | 'lectura'
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
  provider: string
  relevance: number
}

export type MultiProviderResponse = {
  query: string
  area?: string
  status: 'ok' | 'partial' | 'no_results' | 'error'
  providers_queried: string[]
  providers_failed: Array<[string, string]>
  hits: MultiProviderHit[]
  error: string | null
}

export type MultiProviderBatchItem = {
  detalle: string
  cantidad: number
  item_original?: string | null
  quote: MultiProviderResponse
}

export type MultiProviderBatchResponse = {
  items: MultiProviderBatchItem[]
  providers: string[]
  area?: string
  is_demo_mode?: boolean
  demo_message?: string
  was_limited?: boolean
  limited_message?: string
}

export type ParseAiQuoteMultiResponse = ParseAiQuoteResponse & {
  resume: ParseAiQuoteResume & { providers_used: string[] }
}

/**
 * Busca un producto en múltiples fuentes de precio.
 * Retorna resultados consolidados ordenados por relevancia + precio
 */
export async function quoteMultiProviders(
  query: string,
  providers?: string[],
  limitPerProvider?: number,
  area = 'general',
): Promise<MultiProviderResponse> {
  const res = await fetch(`${API_BASE}/quote/multi-providers`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      query: query.trim(),
      providers,
      area,
      limit_per_provider: limitPerProvider || 5,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}

export async function quoteMultiProvidersBatch(
  items: Array<{ detalle: string; cantidad: number; item_original?: string | null }>,
  providers?: string[],
  limitPerProvider?: number,
  area = 'general',
): Promise<MultiProviderBatchResponse> {
  const res = await fetch(`${API_BASE}/quote/multi-providers/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      items,
      providers,
      area,
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
 * Busca en las fuentes seleccionadas o en las fuentes disponibles por defecto.
 */
export async function parseAiQuoteMultiProviders(
  file: File,
  providers?: string,
  area = 'general',
): Promise<ParseAiQuoteMultiResponse> {
  const form = new FormData()
  form.append('file', file)
  
  const url = new URL(`${API_BASE}/parse-ai-quote/multi-providers`, window.location.origin)
  if (providers) {
    url.searchParams.append('providers', providers)
  }
  url.searchParams.append('area', area)
  
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

// API client para requests autenticados
export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: `Error ${res.status}` }))
      throw { response: { data: error, status: res.status } }
    }
    return { data: await res.json() }
  },
  post: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: `Error ${res.status}` }))
      throw { response: { data: error, status: res.status } }
    }
    return { data: await res.json() }
  },
  put: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: `Error ${res.status}` }))
      throw { response: { data: error, status: res.status } }
    }
    return { data: await res.json() }
  },
  delete: async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: `Error ${res.status}` }))
      throw { response: { data: error, status: res.status } }
    }
    return { data: await res.json() }
  },
}

// ============ PLAN DE COMPRA ============

export type PurchasePlanLine = {
  detalle: string | null
  cantidad: number
  provider: string
  price: number
  line_total: number
  title: string | null
  url: string | null
  /** `false` cuando el ítem no está en las tiendas del plan y hay que traerlo aparte. */
  in_plan: boolean
}

export type PurchasePlanMissing = {
  detalle: string | null
  cantidad: number
  reason: 'sin_precio' | 'fuera_del_plan'
  provider?: string
}

export type PurchasePlan = {
  stores: string[]
  extra_stores: string[]
  store_count: number
  items_in_plan: number
  items_total: number
  missing: PurchasePlanMissing[]
  subtotal: number
  shipping: number
  total: number
  lines: PurchasePlanLine[]
}

export type PurchasePlanBaseline = {
  stores?: string[]
  store_count: number
  items_in_plan?: number
  items_total?: number
  subtotal?: number
  shipping?: number
  total: number
  lines?: PurchasePlanLine[]
}

export type PurchasePlanResponse = {
  status: 'ok' | 'no_results'
  /** `true` para usuarios sin plan pagado: llega el ahorro, no el detalle. */
  locked?: boolean
  shipping_cost_per_store: number
  baseline: PurchasePlanBaseline | null
  plans: PurchasePlan[]
  recommended: PurchasePlan | null
  savings: number
  stores_saved: number
  /** Solo en la versión bloqueada: en cuántas tiendas quedaría la compra. */
  store_count?: number | null
}

export type PurchasePlanItem = {
  detalle: string
  cantidad: number
  hits: Array<{
    provider: string
    price: number | null
    title?: string | null
    url?: string | null
    available?: boolean
  }>
}

/**
 * Calcula en qué tiendas conviene comprar la lista completa, comparando el
 * mínimo por ítem contra comprar todo en 1, 2 o 3 tiendas con su despacho.
 */
export async function fetchPurchasePlan(
  items: PurchasePlanItem[],
  shippingCost?: number,
): Promise<PurchasePlanResponse> {
  const res = await fetch(`${API_BASE}/quote/purchase-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      items,
      ...(shippingCost !== undefined ? { shipping_cost: shippingCost } : {}),
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Error ${res.status}`)
  }
  return res.json()
}
