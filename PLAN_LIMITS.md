# Sistema de Límites por Plan

## 📋 Descripción

Sistema de validación que asegura que los usuarios respeten los límites de su plan al crear cotizaciones.

---

## 💰 Planes y Límites

| Plan | Max Items | Max Proveedores | Límite Mensual | Precio |
|------|-----------|-----------------|----------------|--------|
| **Free** | 5 | 2 | Ilimitado | $0 |
| **Basic** | 20 | 5 | 50/mes | $9.990 CLP |
| **Pro** | 100 | 10 | Ilimitado | $29.990 CLP |

---

## 🔍 Qué se Valida

### 1. **Max Items** (`max_items`)
- Máximo de items que pueden incluirse en UNA cotización
- Ejemplo: Plan Free = 5 items por cotización
- ❌ Usuario Free intenta guardar lista de 10 items → Rechazado

### 2. **Max Proveedores** (`max_providers`)
- Máximo de proveedores simultáneamente en la búsqueda
- Aplica cuando usas `/api/quote/multi-providers`
- Plan Free: Solo Dimeiggs + Librería Nacional (2)
- Plan Basic: Hasta 5 proveedores
- Plan Pro: Hasta 10 proveedores

### 3. **Límite Mensual** (`monthly_limit`)
- Máximo de cotizaciones nuevas POR MES
- Ejemplo: Plan Basic = 50 cotizaciones/mes
- Se resetea el 1° de cada mes
- ❌ Usuario Basic con 50 cotizaciones intenta crear la 51ª → Rechazado
- ✅ Día 1 del próximo mes, el contador vuelve a 0

---

## 🔗 Endpoints de Validación

### 1. GET `/api/user/limits` (Nuevo)
Obtiene los límites del usuario y su uso actual.

**Respuesta:**
```json
{
  "plan": "basic",
  "limits": {
    "max_items": 20,
    "max_providers": 5,
    "monthly_limit": 50
  },
  "usage": {
    "quotes_this_month": 23,
    "total_quotes": 127,
    "monthly_remaining": 27
  }
}
```

### 2. POST `/api/user/quotes` (Modificado)
Ahora valida límites antes de guardar.

**Validaciones:**
- ✅ `items.length <= max_items`
- ✅ `providers_count <= max_providers`
- ✅ `quotes_this_month < monthly_limit`

**Respuesta en caso de error:**
```json
{
  "detail": "Máximo 5 items permitidos en tu plan"
}
```

### 3. POST `/api/quote/multi-providers` (Modificado)
Valida el número de proveedores solicitados.

**Validaciones:**
- ✅ `len(providers) <= max_providers`
- ✅ Modo Demo: máximo 2 proveedores (sin autenticación)

---

## 🛠️ Lógica de Validación

```python
# Función en app/payment.py
def validate_quote_limits(user_id, items_count, providers_count, db):
    limits = get_user_limits(user_id, db)
    
    # 1. Validar items
    if items_count > limits["max_items"]:
        return {
            "valid": False,
            "reason": f"Máximo {limits['max_items']} items permitidos",
            "limit": limits["max_items"],
            "current": items_count
        }
    
    # 2. Validar proveedores
    if providers_count > limits["max_providers"]:
        return {
            "valid": False,
            "reason": f"Máximo {limits['max_providers']} proveedores permitidos",
            "limit": limits["max_providers"],
            "current": providers_count
        }
    
    # 3. Validar límite mensual
    if limits["monthly_limit"] is not None:
        quotes_this_month = count_quotes_from_start_of_month(user_id)
        if quotes_this_month >= limits["monthly_limit"]:
            return {
                "valid": False,
                "reason": f"Límite de {limits['monthly_limit']} cotizaciones/mes alcanzado",
                "limit": limits["monthly_limit"],
                "current": quotes_this_month
            }
    
    return {"valid": True}
```

---

## 📱 Experiencia de Usuario

### Escenario 1: Usuario Free intenta 10 items
```
Usuario hace clic en "Guardar Cotización" con 10 items
✅ Frontend: Muestra alerta "Plan Free: máximo 5 items"
❌ Backend rechaza la solicitud (double-check)
💡 Sugerencia: "Actualiza a Plan Basic para 20 items"
```

### Escenario 2: Usuario Basic alcanza límite mensual
```
Usuario Basic guardó 50 cotizaciones este mes
Usuario intenta guardar la 51ª
✅ Validación rechaza
💡 Mensaje: "Límite de 50 cotizaciones/mes alcanzado"
💡 Sugerencia: "Actualiza a Plan Pro para límite ilimitado"
```

### Escenario 3: Usuario Free busca en 5 proveedores
```
Usuario hace request: /api/quote/multi-providers
  "providers": ["dimeiggs", "libreria_nacional", "jamila", "coloranimal", "pronobel"]
✅ Backend limita automáticamente a 2 (Free)
📌 Respuesta incluye: "demo_message: Modo prueba: máximo 2 proveedores"
```

---

## 🚀 Frontend Integration

El frontend debe:

1. **Mostrar límites en la UI**
   ```tsx
   GET /api/user/limits
   Mostrar: "3/5 items", "1/50 cotizaciones este mes"
   ```

2. **Prevenir antes de enviar**
   ```tsx
   if (items.length > limits.max_items) {
     alert("Máximo " + limits.max_items + " items");
     return;
   }
   ```

3. **Mostrar mensajes de error del backend**
   ```tsx
   POST /api/user/quotes
   // Si error 400, mostrar: response.detail
   ```

4. **Promover upgrades**
   ```tsx
   if (is_at_limit) {
     showUpsellModal("Plan Basic", "20 items y 50 cotizaciones/mes");
   }
   ```

---

## 📊 Monitoreo

Para verificar que la validación funciona:

```bash
# 1. Obtener límites del usuario
curl -H "Authorization: Bearer $TOKEN" \
  https://cotizador-backend.../api/user/limits

# 2. Intentar superar límite de items
curl -H "Authorization: Bearer $TOKEN" \
  -X POST https://cotizador-backend.../api/user/quotes \
  -d '{
    "title": "Test",
    "raw_text": "...",
    "items": [1,2,3,4,5,6,7,8,9,10],
    "results": {}
  }'
# Respuesta esperada: 400 "Máximo 5 items permitidos"

# 3. Verificar uso mensual
# Lanzar 50 POST /api/user/quotes (Para usuario Basic)
# 51ª solicitud debe rechazarse con: 400 "Límite de 50 cotizaciones/mes"
```

---

## ✅ Checklist de Implementación

- [x] Función `validate_quote_limits()` en `payment.py`
- [x] Endpoint `GET /api/user/limits`
- [x] Validación en `POST /api/user/quotes`
- [x] Validación en `POST /api/quote/multi-providers`
- [x] Manejo de límite mensual
- [x] Mensajes de error descriptivos
- [ ] UI Frontend para mostrar límites
- [ ] UI Frontend para prevenir antes de enviar
- [ ] Promoción de upgrades
- [ ] Tests end-to-end

---

## 🔐 Consideraciones de Seguridad

⚠️ **Siempre validar en backend** - El frontend NO es confiable
- Los límites se verifican en `payment.py`
- No confíes en datos del cliente
- El cliente no puede bypassear la validación

✅ **Validación de usuario**
- Usa `get_current_user` para autenticación
- Verifica que la cotización pertenece al usuario
- Previene acceso a cotizaciones de otros usuarios

---

## 🐛 Troubleshooting

**Q: Mi usuario Free no ve la restricción de 2 proveedores**
- A: Confirma que el header `Authorization` se está enviando
- Si no hay token, se activa modo Demo (automáticamente limitado a 2)

**Q: Contador mensual no se resetea**
- A: Verifica que la fecha sea del próximo mes
- El contador usa `start_of_month = datetime(now.year, now.month, 1)`

**Q: Usuario Pro debería ser ilimitado pero se rechaza**
- A: Verifica que `monthly_limit: null` en la BD (no 0)
- `None` (null) = ilimitado en Python/SQL

---

## 📞 Contacto

Para preguntas sobre esta implementación, contacta a Felipe.
