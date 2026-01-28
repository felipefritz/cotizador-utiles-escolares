# 🚀 GUÍA RÁPIDA: Activar Mercado Pago

## En 3 pasos simples:

### 1️⃣ Obtener credenciales
```
Dashboard Mercado Pago (https://www.mercadopago.cl)
↓
Configuración → Credenciales
↓
Copiar Access Token (PRODUCCIÓN)
```

### 2️⃣ Configurar en Railway
```
Tu proyecto en railway.app
↓
Variables (en tu servicio backend)
↓
Agregar:
  MERCADO_PAGO_ACCESS_TOKEN = [tu token]
  MERCADO_PAGO_PUBLIC_KEY = [tu public key]
  BASE_URL = https://cotizador-backend-production-31ef.up.railway.app
↓
Redeploy
```

### 3️⃣ Configurar webhook
```
Dashboard Mercado Pago
↓
Webhooks / Notificaciones
↓
Agregar URL: https://cotizador-backend-production-31ef.up.railway.app/api/payment/webhook
↓
Eventos: payment.created, payment.updated
```

## ✅ Verificar que funcione

- Inicia sesión en tu app
- Ve a "Tu Cuenta" → "Planes"
- Haz clic en "Contratar" en un plan
- Deberá abrir Mercado Pago

**Para probar sin dinero real:**
- Tarjeta: `4111 1111 1111 1111`
- Vencimiento: `11/25`
- CVV: `123`

## 📝 Código actualizado

El código ya tiene:
- ✅ `app/payment.py` - Integración mejorada con mejor manejo de errores
- ✅ `app/main.py` - Endpoints verificando credenciales
- ✅ `frontend/src/api.ts` - API client con mejor manejo de errores
- ✅ `frontend/src/components/UserDashboard.tsx` - Checkout mejorado

## 🔍 Solucionar problemas

**Error: "Sistema de pagos no disponible"**
→ Las variables no están en Railway. Verifica que agregaste MERCADO_PAGO_ACCESS_TOKEN

**Error: "URL de pago no disponible"**
→ El Access Token es inválido o expiró

**Pago aprobado pero suscripción no se actualiza**
→ El webhook no se disparó. Revisa los logs en Railway

**Ver logs en Railway:**
```
Tu proyecto → Logs → filtrar por "payment" o "webhook"
```

---

**¿Dudas?** Revisa `MERCADO_PAGO_SETUP.md` para la guía completa.
