# 🧪 Testing - Mercado Pago

## Cómo probar el sistema de pagos

### 1. Testing local (sin dinero real)

**Requisitos:**
- Variables de entorno configuradas (`.env` local)
- Backend corriendo
- Base de datos PostgreSQL conectada

**Variables `.env` para pruebas:**
```bash
DATABASE_URL=postgresql://user:password@localhost/cotizador_db
SECRET_KEY=your-secret-key-here
MERCADO_PAGO_ACCESS_TOKEN=TEST-1234567890abcdef... (token de prueba)
MERCADO_PAGO_PUBLIC_KEY=APP_USR_1234567890abcdef...
BASE_URL=http://localhost:3000
```

### 2. Pruebas en Railway (PRODUCCIÓN)

**Verificar que las variables estén seteadas:**
```bash
# En Railway dashboard, bajo "Variables" de tu backend:
✓ MERCADO_PAGO_ACCESS_TOKEN
✓ MERCADO_PAGO_PUBLIC_KEY  
✓ BASE_URL
```

### 3. Flujo de testing completo

#### A. Crear usuario
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

Respuesta esperada:
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

#### B. Login
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

Respuesta esperada:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

Guardar el `access_token` para los siguientes requests.

#### C. Obtener planes disponibles
```bash
curl -X GET "http://localhost:8000/api/plans"
```

Respuesta esperada:
```json
[
  {
    "id": 1,
    "name": "free",
    "price": 0,
    "max_items": 5,
    "max_providers": 2,
    "billing_cycle": "lifetime"
  },
  {
    "id": 2,
    "name": "basic",
    "price": 4990,
    "max_items": 50,
    "max_providers": 10,
    "billing_cycle": "monthly"
  },
  {
    "id": 3,
    "name": "pro",
    "price": 14990,
    "max_items": 9999,
    "max_providers": 9999,
    "billing_cycle": "monthly"
  }
]
```

#### D. Crear checkout (IMPORTANTE!)
```bash
curl -X POST "http://localhost:8000/api/payment/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "plan_id": 2
  }'
```

Respuesta esperada:
```json
{
  "preference_id": "123456789",
  "checkout_url": "https://checkout.mercadopago.com/checkout/v1/redirect?pref_id=123456789",
  "success": true
}
```

**Si recibes error "Mercado Pago no configurado":**
- ✓ Verifica que `MERCADO_PAGO_ACCESS_TOKEN` está en Railway
- ✓ Redeploy el backend
- ✓ Espera 1-2 minutos para que se aplique

#### E. Abrir checkout
- Copia la `checkout_url`
- Ábuela en el navegador
- Verás el formulario de Mercado Pago

#### F. Pagar con tarjeta de prueba
- Tarjeta: `4111 1111 1111 1111`
- Vencimiento: `11/25`
- CVV: `123`
- Nombre: `Cualquier nombre`

**Resultado esperado:**
- ✅ Pago APROBADO
- 🔄 Redirigido a: `https://tuapp/#/dashboard?payment=success`
- 💾 Base de datos actualizada: Payment status = "completed"
- 👥 Suscripción creada para el usuario
- 📊 Limites actualizados

### 4. Testing del Webhook

El webhook se dispara automáticamente cuando:
1. ✅ Pago es aprobado
2. ❌ Pago es rechazado
3. ⏳ Cambio de estado

**Simular webhook manualmente (para testing):**
```bash
curl -X POST "http://localhost:8000/api/payment/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.created",
    "data": {
      "id": "123456789"
    }
  }'
```

**Verificar en logs:**
- Railway dashboard → Logs
- Filtrar por: "payment", "webhook", "Pago", "payment_id"

Deberías ver logs como:
```
🔔 Webhook recibido: {'action': 'payment.created', ...}
📊 Estado del pago 123456789: approved
✅ Pago APROBADO
✨ Suscripción creada para usuario 1
✅ Webhook procesado exitosamente
```

### 5. Verificar suscripción
```bash
curl -X GET "http://localhost:8000/api/user/subscription" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

Respuesta esperada:
```json
{
  "id": 1,
  "plan_name": "basic",
  "plan_id": 2,
  "status": "active",
  "started_at": "2025-01-28T15:30:00",
  "expires_at": "2025-02-28T15:30:00",
  "max_items": 50,
  "max_providers": 10,
  "monthly_limit": null
}
```

### 6. Verificar limites del usuario
```bash
curl -X GET "http://localhost:8000/api/parse-ai-items-only" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -F "file=@lista.txt"
```

El sistema verificará automáticamente:
- Items máximos permitidos (50 para basic)
- Cantidad de proveedores (10 para basic)
- Y aplicará los límites

---

## 🐛 Debugging

### Ver logs en Railway:
```bash
# Terminal con Railway CLI
railway logs --service backend

# O en dashboard:
# https://railway.app → Tu proyecto → Logs
```

### Buscar problemas de pago:
```
Logs contienen: "❌ Error", "payment", "webhook"
```

### Verificar BD:
```sql
-- Conectar a la BD PostgreSQL en Railway
SELECT * FROM payment WHERE created_at > NOW() - INTERVAL '1 hour';
SELECT * FROM subscription WHERE user_id = 1;
```

### Mercado Pago Dashboard:
- Ir a: https://www.mercadopago.com.ar/admin/activity
- Ver historial de pagos
- Webhook logs: https://www.mercadopago.com.ar/admin/notifications

---

## ✅ Checklist para verificar que todo funciona

- [ ] Backend online en Railway
- [ ] Variables configuradas en Railway
- [ ] PostgreSQL conectada
- [ ] Usuario creado y autenticado
- [ ] GET /api/plans retorna 3 planes
- [ ] POST /api/payment/checkout genera URL válida
- [ ] URL de checkout abre Mercado Pago
- [ ] Pago con tarjeta de prueba es aprobado
- [ ] Webhook se dispara automáticamente
- [ ] Suscripción se crea en BD
- [ ] GET /api/user/subscription muestra plan activo
- [ ] Limites se aplican correctamente

---

## 📞 Si algo falla

1. **Revisa los logs** en Railway
2. **Verifica variables** están todas presentes
3. **Redeploy** el backend
4. **Espera 2 minutos** para que se aplique
5. **Intenta de nuevo**

Si persiste el error, contacta a soporte de Mercado Pago.
