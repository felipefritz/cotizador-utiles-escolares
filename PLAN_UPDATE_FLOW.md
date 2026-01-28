# Sistema de Actualización de Plan

## 📋 Descripción

Cuando un usuario compra un plan a través de Mercado Pago, el sistema se asegura de que:
1. ✅ El pago se registre en la BD (tabla `payments`)
2. ✅ La suscripción se actualice automáticamente (tabla `subscriptions`)
3. ✅ El frontend se notifique y recargue los datos
4. ✅ El usuario vea su nuevo plan inmediatamente en la UI

---

## 🔄 Flujo Completo

```
USUARIO EN FRONTEND
    ↓
1. Hace clic en "Contratar Plan Basic"
    ↓
2. Frontend: POST /api/payment/checkout
    ↓
BACKEND
3. Crea pago pendiente en DB (status: "pending")
4. Retorna checkout_url de Mercado Pago
    ↓
5. Frontend: window.location.href = checkout_url
    ↓
MERCADO PAGO
6. Usuario ingresa tarjeta y completa pago
7. Mercado Pago procesa y aprueba
    ↓
8. Webhook: POST /api/payment/webhook (status: "approved")
    ↓
BACKEND
9. Procesa webhook:
   - Actualiza Payment: status = "completed"
   - Busca/crea Subscription
   - Actualiza plan_id en Subscription
   - Marca status = "active"
    ↓
10. Usuario redirigido: dashboard?payment=success
    ↓
FRONTEND (NUEVO)
11. Detecta parámetro ?payment=success
12. Espera 2 segundos (para que webhook procese)
13. Recarga: GET /api/user/subscription
14. Recarga: GET /api/user/limits
15. Muestra notificación: "✅ Pago completado"
16. UI se actualiza con nuevo plan
    ↓
USUARIO VE
- Plan actualizado en el dashboard
- Límites nuevos (items, proveedores, mensual)
- Notificación de confirmación
```

---

## 💾 Base de Datos

### Tabla `payments`
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  plan_id INTEGER,
  amount FLOAT,
  status ENUM('pending', 'completed', 'failed', 'cancelled'),
  mercado_pago_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Ejemplo:**
```json
{
  "id": 1,
  "user_id": 5,
  "plan_id": 2,  // Plan Basic
  "amount": 9990,  // CLP
  "status": "completed",
  "mercado_pago_id": "12345678-abcd-efgh",
  "created_at": "2026-01-28T10:00:00",
  "updated_at": "2026-01-28T10:05:00"
}
```

### Tabla `subscriptions`
```sql
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE,
  plan_id INTEGER,
  status ENUM('active', 'expired', 'cancelled'),
  started_at TIMESTAMP,
  expires_at TIMESTAMP,  // NULL = nunca expira (lifetime)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Ejemplo (Usuario con Plan Basic - mensual):**
```json
{
  "id": 1,
  "user_id": 5,
  "plan_id": 2,  // Plan Basic
  "status": "active",
  "started_at": "2026-01-28T10:05:00",
  "expires_at": "2026-02-28T10:05:00",  // 30 días
  "created_at": "2026-01-28T10:05:00",
  "updated_at": "2026-01-28T10:05:00"
}
```

**Ejemplo (Usuario con Plan Pro - lifetime):**
```json
{
  "id": 2,
  "user_id": 6,
  "plan_id": 3,  // Plan Pro
  "status": "active",
  "started_at": "2026-01-28T11:00:00",
  "expires_at": null,  // No expira
  "created_at": "2026-01-28T11:00:00",
  "updated_at": "2026-01-28T11:00:00"
}
```

---

## 🔗 Endpoints Clave

### 1. POST `/api/payment/checkout`
**Objetivo:** Iniciar proceso de pago

**Request:**
```json
{
  "plan_id": 2
}
```

**Response:**
```json
{
  "preference_id": "123456789-abcd",
  "checkout_url": "https://checkout.mercadopago.com/checkout/v1/redirect?pref_id=123456789-abcd",
  "success": true
}
```

**Qué hace en Backend:**
- ✅ Valida que el usuario esté autenticado
- ✅ Valida que el plan exista
- ✅ Rechaza si es plan "free"
- ✅ Crea Payment con status "pending"
- ✅ Retorna checkout_url

---

### 2. POST `/api/payment/webhook` (Mercado Pago)
**Objetivo:** Procesar notificación de Mercado Pago

**Request (desde Mercado Pago):**
```json
{
  "action": "payment.updated",
  "data": {
    "id": 12345678
  }
}
```

**Qué hace en Backend:**
- ✅ Obtiene estado del pago de MP API
- ✅ Si status = "approved":
  - Actualiza Payment: status = "completed"
  - Busca Subscription del usuario
  - Si no existe, crea una nueva
  - Actualiza plan_id y status = "active"
  - Calcula expires_at (30 días si monthly)
- ✅ Si status = "rejected": Payment status = "failed"
- ✅ Confirma con: `{"success": true}`

---

### 3. GET `/api/user/subscription`
**Objetivo:** Obtener suscripción actual del usuario

**Response (Usuario con Plan Basic):**
```json
{
  "id": 1,
  "plan_name": "basic",
  "plan_id": 2,
  "status": "active",
  "started_at": "2026-01-28T10:05:00",
  "expires_at": "2026-02-28T10:05:00",
  "max_items": 20,
  "max_providers": 5,
  "monthly_limit": 50
}
```

**Response (Usuario sin suscripción = Plan Free):**
```json
null
```

**Frontend lo usa para:**
- ✅ Mostrar plan actual en dashboard
- ✅ Mostrar fecha de expiración
- ✅ Cambiar botón "Contratar" a "Cambiar Plan"

---

### 4. GET `/api/payment/status` (NUEVO)
**Objetivo:** Verificar estado del pago más reciente

**Response (Pago completado):**
```json
{
  "has_payment": true,
  "status": "completed",
  "plan_id": 2,
  "amount": 9990,
  "created_at": "2026-01-28T10:00:00",
  "is_completed": true,
  "message": "✅ Pago completado! Tu plan ha sido actualizado"
}
```

**Response (Pago pendiente):**
```json
{
  "has_payment": true,
  "status": "pending",
  "plan_id": 2,
  "amount": 9990,
  "created_at": "2026-01-28T10:00:00",
  "is_completed": false,
  "message": "Pago pendiente - Mercado Pago está procesando"
}
```

**Response (Sin pagos):**
```json
{
  "has_payment": false,
  "status": "no_payment",
  "message": "No hay pagos registrados"
}
```

---

### 5. GET `/api/user/limits` (EXISTENTE)
**Objetivo:** Obtener límites y uso del usuario

**Response:**
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

---

## 🎬 Implementación en Frontend

### Componente: UserDashboard.tsx

**1. Detectar vuelta de Mercado Pago:**
```tsx
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const paymentParam = params.get('payment');
  
  if (paymentParam) {
    console.log('🔍 Detectado parámetro:', paymentParam);
    setPaymentStatus(paymentParam);
    
    // Esperar a que webhook procese
    setTimeout(() => {
      console.log('🔄 Recargando datos...');
      loadData();
    }, 2000);
    
    // Limpiar URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, [location.search]);
```

**2. Mostrar notificación:**
```tsx
useEffect(() => {
  if (paymentStatus === 'success') {
    setMessage('✅ ¡Pago completado! Tu plan ha sido actualizado.');
    setMessageType('success');
  } else if (paymentStatus === 'failure') {
    setMessage('❌ El pago fue rechazado.');
    setMessageType('error');
  }
}, [paymentStatus]);
```

**3. Recargar datos:**
```tsx
const loadData = async () => {
  try {
    const subRes = await api.get('/user/subscription');
    setSubscription(subRes.data);  // Se actualiza automáticamente
    
    const limitsRes = await api.get('/user/limits');
    // UI se actualiza con nuevos límites
  } catch (error) {
    console.error('Error loading data:', error);
  }
};
```

---

## 🧪 Prueba Manual

### Paso 1: Crear un pago
```bash
curl -X POST http://localhost:8000/api/payment/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_id": 2}'
```

**Response:**
```json
{
  "preference_id": "...",
  "checkout_url": "https://checkout.mercadopago.com/...",
  "success": true
}
```

### Paso 2: Simular pago en Mercado Pago
- Abre el checkout_url
- Usa tarjeta de prueba: **4111 1111 1111 1111**
- Vencimiento: cualquier fecha futura
- CVV: cualquier número

### Paso 3: Verificar actualización
1. Mercado Pago redirecciona a: `dashboard?payment=success`
2. Frontend detecta parámetro
3. Recarga datos
4. Aparece notificación: "✅ Pago completado"
5. Plan se actualiza en UI

### Paso 4: Verificar BD
```sql
-- Verificar Payment
SELECT * FROM payments WHERE user_id = 5 ORDER BY created_at DESC LIMIT 1;
-- status debe ser: "completed"

-- Verificar Subscription
SELECT * FROM subscriptions WHERE user_id = 5;
-- plan_id debe estar actualizado
-- status debe ser: "active"
```

---

## ⏱️ Tiempos

| Evento | Tiempo | Quién |
|--------|--------|--------|
| Usuario completa pago en MP | 0s | Mercado Pago |
| MP redirecciona a dashboard | ~2s | Mercado Pago |
| Webhook recibe notificación | ~0-5s | MP → Backend |
| Frontend detecta parámetro | ~0s | Frontend |
| Espera para webhook | 2s | Frontend |
| Recarga /user/subscription | ~0.5s | Frontend |
| UI actualiza | ~0s | React |
| **Total hasta ver actualización** | **~3-5s** | - |

---

## 🔐 Seguridad

✅ **Validaciones:**
- Bearer token requerido en /payment/checkout
- Verificación de usuario en webhook (via mercado_pago_id)
- Status solo actualiza si webhook válido

✅ **Protecciones:**
- Suscripción es UNIQUE por user_id (un usuario = un plan activo)
- Payment.mercado_pago_id es UNIQUE (no duplicados)
- Webhook requiere validación de Mercado Pago

⚠️ **TODO (en el futuro):**
- Validar firma del webhook de Mercado Pago
- Implementar reintentos si webhook falla
- Refund automático si usuario cancela

---

## 🐛 Troubleshooting

**Q: Pago completado pero el plan no se actualiza**
- A1: Verifica que el webhook de Mercado Pago esté configurado correctamente
- A2: Revisa logs del backend (busca "Webhook procesado")
- A3: Verifica que la BD no tenga errores (revisa tabla `payments`)

**Q: El frontend sigue mostrando plan anterior**
- A1: Limpiar cache del navegador (Ctrl+Shift+Delete)
- A2: Asegúrate de que `loadData()` se llama (verifica logs)
- A3: Verifica que GET /user/subscription retorne nuevo plan

**Q: Webhook no se ejecuta**
- A1: Verifica URL del webhook en Mercado Pago: 
  `https://cotizador-backend-production.../api/payment/webhook`
- A2: Marca eventos: `payment.created` y `payment.updated`
- A3: Revisa logs de Railway (Logs → filtrar "payment")

**Q: "Suscripción duplicada" error en DB**
- A: Usuario ya tiene suscripción activa
- Solución: Implementar UPDATE en lugar de CREATE si existe

---

## ✅ Checklist

- [x] Endpoint POST /api/payment/checkout
- [x] Webhook POST /api/payment/webhook
- [x] Endpoint GET /api/user/subscription
- [x] Endpoint GET /api/payment/status
- [x] Guardar Payment en BD
- [x] Crear/Actualizar Subscription en BD
- [x] Frontend detecta ?payment=success
- [x] Frontend recarga datos automáticamente
- [x] Frontend muestra notificación
- [x] UI se actualiza en tiempo real
- [ ] Webhook valida firma de Mercado Pago
- [ ] Reintentos si webhook falla
- [ ] Refund automático
- [ ] Tests end-to-end

---

## 📞 Debug

**Activar logs en payment.py:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Ver qué sucede en el webhook:**
1. Railway Dashboard → Cotizador Backend → Logs
2. Filtrar por: "payment", "webhook", "Pago"
3. Buscar: "✅", "❌", "⏳"

