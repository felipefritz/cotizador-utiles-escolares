# Configuración de Mercado Pago

## 📋 Pasos para configurar Mercado Pago en tu aplicación

### 1. Crear cuenta en Mercado Pago (si no la tienes)

- Ve a: https://www.mercadopago.cl
- Crea una cuenta de vendedor con tus datos
- Verifica tu email

### 2. Obtener tus credenciales

1. **Inicia sesión** en tu dashboard de Mercado Pago
2. Ve a **Configuración** → **Datos de tu negocio** o **Integraciones**
3. Busca la sección de **Credenciales**
4. Copia:
   - **Access Token** (clave privada - NO compartir)
   - **Public Key** (clave pública - segura para compartir)

> ⚠️ **Importante**: Existen credenciales de PRUEBA y PRODUCCIÓN. Usa PRODUCCIÓN para cobrar de verdad.

### 3. Configurar variables en Railway (Backend)

1. Ve a tu proyecto en Railway: https://railway.app
2. Selecciona tu servicio backend
3. Ve a **Variables** → **Add Variable**
4. Agrega estas 3 variables:

```
MERCADO_PAGO_ACCESS_TOKEN = tu_access_token_aqui
MERCADO_PAGO_PUBLIC_KEY = tu_public_key_aqui
BASE_URL = https://cotizador-backend-production-31ef.up.railway.app
```

5. **Redeploy** el backend para que se apliquen los cambios

### 4. Configurar Webhook en Mercado Pago

1. En tu dashboard de Mercado Pago, ve a **Configuración** → **Webhooks** o **Notificaciones**
2. Crea un nuevo webhook con:
   - **URL**: `https://cotizador-backend-production-31ef.up.railway.app/api/payment/webhook`
   - **Eventos**: Selecciona `payment.created` y `payment.updated`

3. Mercado Pago te enviará una solicitud de prueba - debe retornar `{"success": true}`

### 5. Actualizar Frontend (Vercel)

El frontend ya está configurado para:
- Redirigir a Mercado Pago Checkout
- Procesar respuesta de pago
- Mostrar estado de suscripción

Solo asegúrate de que la URL del backend sea correcta en `frontend/src/api.ts`:

```typescript
const BASE_API = process.env.REACT_APP_API_URL || "https://cotizador-backend-production-31ef.up.railway.app/api";
```

### 6. Probar el flujo de pago

1. **Como usuario NO autenticado**:
   - Verás el modal de planes
   - Haz clic en "Contratar" en el plan Basic o Pro
   - Deberá pedirte login

2. **Como usuario autenticado**:
   - Ve a Tu Cuenta → Planes
   - Haz clic en "Contratar" en un plan de pago
   - Se abrirá Mercado Pago Checkout
   - **Modo prueba**: Usa tarjeta `4111 1111 1111 1111`, cualquier fecha futura, CVV 123

3. **Después del pago**:
   - Deberá mostrar "success" en la URL
   - Tu suscripción se activará automáticamente
   - Verás tus límites actualizados

### 7. Credenciales de prueba de Mercado Pago

Para probar SIN dinero real, usa estas tarjetas en MODO PRUEBA:

| Tarjeta | Número | Vencimiento | CVV |
|---------|---------|-------------|-----|
| Visa | 4111 1111 1111 1111 | 11/25 | 123 |
| Mastercard | 5555 5555 5555 4444 | 11/25 | 123 |
| Amex | 3782 822463 10005 | 11/25 | 1234 |

> Para que falle el pago, usa fecha de vencimiento anterior a hoy

### 8. Solucionar problemas

#### Error: "Mercado Pago no configurado"
- Verifica que `MERCADO_PAGO_ACCESS_TOKEN` esté en Railway
- Redeploy el backend
- Espera 1-2 minutos para que se aplique

#### Webhook no se dispara
- Verifica la URL del webhook en Mercado Pago
- Revisa el log de Mercado Pago Dashboard → Webhooks → Historial
- Asegúrate de que el backend esté online (Railway)

#### Pago aprobado pero suscripción no se actualiza
- Revisa los logs del backend en Railway
- Verifica que el webhook esté configurado correctamente
- Comprueba que la base de datos PostgreSQL esté online

#### Tarjeta rechazada en prueba
- Usa solo las tarjetas de prueba listadas arriba
- Si usas PRODUCCIÓN por error, cierra la sesión y abre en PRUEBA

### 9. Transicionar a PRODUCCIÓN

Cuando estés listo para cobrar dinero real:

1. En Mercado Pago, copia las credenciales de **PRODUCCIÓN** (no prueba)
2. Actualiza las variables en Railway:
   ```
   MERCADO_PAGO_ACCESS_TOKEN = tu_token_produccion
   MERCADO_PAGO_PUBLIC_KEY = tu_public_key_produccion
   ```
3. Redeploy el backend
4. Las transacciones de verdad comenzarán a procesarse

### 10. Verificar estado de pagos

Endpoint para verificar estado de suscripción del usuario:

```bash
curl -X GET "https://cotizador-backend-production-31ef.up.railway.app/api/user/subscription" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Respuesta:
```json
{
  "id": 1,
  "plan_name": "basic",
  "plan_id": 2,
  "status": "active",
  "started_at": "2025-01-28T10:30:00",
  "expires_at": "2025-02-28T10:30:00",
  "max_items": 50,
  "max_providers": 10,
  "monthly_limit": null
}
```

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa los logs**: Railway dashboard → Tu proyecto → Logs
2. **Verifica las credenciales**: Copia-pega exactamente, sin espacios
3. **Contacta a Mercado Pago**: https://www.mercadopago.com.ar/ayuda

---

**✅ Una vez completados estos pasos, tu sistema de pagos estará completamente funcional.**
