# Integración Frontend - Multi-Proveedor

## 🔌 Cambios Realizados en Frontend

Ya hemos actualizado los archivos del frontend para soportar multi-proveedor:

### 1. `api.ts` - Nuevas funciones (✅ ACTUALIZADO)

Se agregaron:
- `quoteMultiProviders(query, providers?, limitPerProvider?)` 
- `parseAiQuoteMultiProviders(file, providers?)`
- Tipos: `MultiProviderHit`, `MultiProviderResponse`

```typescript
// Buscar en múltiples proveedores
const result = await quoteMultiProviders(
  "lápiz grafito",
  ["dimeiggs", "jumbo", "lider", "lapiz_lopez"],
  5
)
```

### 2. `types.ts` - Nuevos proveedores (✅ ACTUALIZADO)

Se actualizaron:
- `SOURCES` - Ahora Jumbo, Lider y Lápiz López están marcados como `available: true`
- `SourceId` - Agregado `'lider'` al tipo
- `ItemQuote` - Agregado campo `multi?: MultiProviderResponse`

```typescript
export const SOURCES = [
  { id: 'dimeiggs', name: 'Dimeiggs', available: true },
  { id: 'lapiz_lopez', name: 'Lápiz López', available: true },  // ✅ activado
  { id: 'jumbo', name: 'Jumbo', available: true },               // ✅ activado
  { id: 'lider', name: 'Lider', available: true },               // ✅ activado
  { id: 'nueva_fuente', name: 'Nueva fuente', available: false },
  { id: 'walmart', name: 'Walmart', available: false },
]
```

---

## 🛠️ Próximos Pasos: Integrar en Flujo

Para completar la integración, necesitas hacer cambios en:

### 3️⃣ `UploadStep.tsx` - Agregar opción Multi-Proveedor

Dentro de `UploadStep.tsx`, cuando se carga el archivo, ofrecer la opción de:
- Usar solo Dimeiggs (rápido)
- Usar Multi-Proveedor (más lento, pero mejor precio)

```tsx
// Opción 1: Solo Dimeiggs (existente)
const data = await parseAiQuoteDimeiggs(file)

// Opción 2: Multi-Proveedor (nuevo)
const data = await parseAiQuoteMultiProviders(file, 'dimeiggs,jumbo,lider,lapiz_lopez')
```

### 4️⃣ `SourcesStep.tsx` - Mejorar UI

El componente ya existe y muestra los proveedores. Con los cambios en `types.ts`, ahora mostrará:
- ✅ Dimeiggs (ya funciona)
- ✅ Jumbo (ahora disponible)
- ✅ Lider (ahora disponible)
- ✅ Lápiz López (ahora disponible)

No necesita cambios, ¡ya funciona!

### 5️⃣ `QuoteStep.tsx` - Mostrar Resultados Multi-Proveedor

El componente actual solo muestra `dimeiggs`. Para mostrar múltiples proveedores:

**Opción A: Mostrar proveedor con mejor precio**
```tsx
// En QuoteStep.tsx
const bestHit = r.multi?.hits?.[0]  // ya está ordenado por relevancia + precio
const unit = bestHit?.price ?? null
```

**Opción B: Mostrar todos los proveedores en tabs**
```tsx
// En AccordionDetails
{r.multi?.hits?.map(hit => (
  <Box key={hit.provider}>
    [{hit.provider.toUpperCase()}] {hit.title}
    - Relevancia: {(hit.relevance * 100).toFixed(0)}%
  </Box>
))}
```

---

## 📋 Plan de Implementación Detallado

### Fase 1: Backend ✅ (YA HECHO)
- [x] Crear clientes para Jumbo/Lider/Lápiz López
- [x] Crear agregador multi-proveedor
- [x] Agregar endpoints FastAPI
- [x] Testar todo

### Fase 2: Frontend (EN PROGRESO)
- [x] Actualizar tipos en `types.ts`
- [x] Agregar funciones en `api.ts`
- [ ] Actualizar `UploadStep.tsx` (PRÓXIMO)
- [ ] Actualizar `QuoteStep.tsx` (PRÓXIMO)
- [ ] Testar UI end-to-end

---

## 🎯 Opción Recomendada: Implementación Mínima

Para que Multi-Proveedor funcione CON MÍNIMOS CAMBIOS:

### Paso 1: Cambiar `App.tsx`

```tsx
// OLD:
const onParsed = useCallback((data: ParseAiQuoteResponse) => {
  setSelectedItems(buildSelectedItems(data))
  setStep(1)
}, [])

// NEW: pasar la data completa con quotes
const onParsed = useCallback((data: ParseAiQuoteResponse) => {
  setSelectedItems(buildSelectedItems(data))
  setStep(1)
}, [])

// Y cambiar resultsForQuoteStep:
const resultsForQuoteStep: ItemQuote[] = useMemo(() => {
  return selectedItems
    .filter((i) => i.selected)
    .map((i) => {
      const it = i.item as ItemWithQuote
      return {
        item: i.item,
        quantity: i.quantity,
        dimeiggs: it.quote ?? { status: 'not_found' as const, hits: [], error: 'N/A' },
        multi: undefined,  // TODO: llenar cuando uses parseAiQuoteMultiProviders
      }
    })
}, [selectedItems])
```

### Paso 2: Actualizar `UploadStep.tsx`

Agregar botón "Cotizar en múltiples tiendas":

```tsx
// OLD:
const handleQuickQuote = async (file: File) => {
  setLoading(true)
  try {
    const data = await parseAiQuoteDimeiggs(file)
    onParsed(data)
  } catch (err) {
    ...
  } finally {
    setLoading(false)
  }
}

// NEW: 
const [quoteMode, setQuoteMode] = useState<'dimeiggs' | 'multi'>('dimeiggs')

const handleQuickQuote = async (file: File) => {
  setLoading(true)
  try {
    const data = quoteMode === 'multi'
      ? await parseAiQuoteMultiProviders(file, 'dimeiggs,jumbo,lider,lapiz_lopez')
      : await parseAiQuoteDimeiggs(file)
    onParsed(data)
  } catch (err) {
    ...
  } finally {
    setLoading(false)
  }
}

// Y en el JSX, agregar toggle:
<Button 
  onClick={() => setQuoteMode(quoteMode === 'dimeiggs' ? 'multi' : 'dimeiggs')}
>
  Modo: {quoteMode === 'multi' ? '🔍 Multi-Proveedor' : '⚡ Dimeiggs (rápido)'}
</Button>
```

### Paso 3: Actualizar `QuoteStep.tsx`

Mostrar proveedor del mejor hit:

```tsx
// En la tabla, cambiar:
{r.dimeiggs?.hits?.length ? (
  <Chip label={r.dimeiggs?.hits?.[0]?.brand || 'Dimeiggs'} size="small" />
) : null}

// En los acordeones, mostrar proveedor:
{r.dimeiggs?.hits?.slice(0, 8).map((h, i) => (
  <Box component="li" key={i} sx={{ mb: 1 }}>
    <Chip 
      label={h.provider?.toUpperCase() || 'N/A'} 
      size="small" 
      variant="outlined"
      sx={{ mr: 0.5 }}
    />
    <Link href={h.url} target="_blank">
      {h.title}
      {h.price && ` · ${formatCLP(h.price)}`}
      <OpenInNewIcon sx={{ fontSize: 14 }} />
    </Link>
  </Box>
))}
```

---

## 🚀 Alternativa: Flujo Completo (Mejor UX)

Si quieres máxima fluidez sin Step 2 (SourcesStep):

```tsx
// App.tsx
const STEPS = ['Subir lista', 'Seleccionar útiles', 'Cotización']

// En lugar de tener SourcesStep separado,
// integrar selección de proveedores en UploadStep
// o mostrar resultados multi-proveedor directamente
```

---

## 📝 Checklist de Implementación

- [ ] Importar nuevas funciones en componentes
- [ ] Actualizar `UploadStep.tsx` con toggle/opción multi
- [ ] Actualizar `QuoteStep.tsx` para mostrar proveedor
- [ ] Testar flujo completo:
  - [ ] Upload PDF
  - [ ] Parse + Items
  - [ ] Seleccionar modo (Dimeiggs vs Multi)
  - [ ] Ver resultados con múltiples proveedores
  - [ ] Ver precios consolidados
- [ ] Verificar que Jumbo/Lider/Lápiz López aparezcan en resultados
- [ ] Testing en Chrome/Safari/Firefox

---

## 💡 Tips

**Para testing local:**
```bash
# Terminal 1: Backend
cd /path/to/cotizador-utiles
./venv/bin/uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

**Para debugging:**
```typescript
// En browser DevTools Console:
fetch('http://localhost:8000/quote/multi-providers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'cuaderno',
    providers: ['dimeiggs', 'jumbo']
  })
}).then(r => r.json()).then(console.log)
```

---

## 🎉 Resultado Final

Una vez completado, el frontend permitirá:

1. **Subir PDF** con lista de útiles
2. **Elegir modo de cotización:**
   - ⚡ Dimeiggs (rápido, ~5s)
   - 🔍 Multi-Proveedor (lento, ~15s)
3. **Ver resultados** ordenados por relevancia + precio
4. **Filtrar por proveedor** (opcional)
5. **Calcular total** con mejor precio disponible

¡Listo!
