# 🎯 PASOS FINALES PARA ACTIVAR MERCADO PAGO

## Tu sistema está listo. Solo necesitas 3 acciones:

---

## ✅ PASO 1: Obtener credenciales de Mercado Pago

### 1.1 Ve a tu dashboard
- URL: https://www.mercadopago.cl/dashboard
- Inicia sesión con tu cuenta

### 1.2 Obtener Access Token y Public Key
1. Ve a **Configuración** (engranaje arriba a la derecha)
2. Busca **Credenciales** o **Integraciones**
3. Deberías ver dos conjuntos de credenciales:
   - **PRUEBA** (para testing sin dinero)
   - **PRODUCCIÓN** (para dinero real)

4. **Para PRODUCCIÓN** (recomendado), copia:
   - `Access Token`: Algo como `APP_USR_123456789abcdefghijklmnop`
   - `Public Key`: Algo como `APP_USR_123456789abcdefghijklmnop` (diferente)

> ⚠️ **Importante**: No compartir el Access Token con nadie

---

## ✅ PASO 2: Configurar en Railway (Backend)

### 2.1 Ir a tu proyecto en Railway
- URL: https://railway.app/dashboard
- Selecciona tu proyecto "cotizador-utiles"

### 2.2 Abrir Variables del Backend
1. Haz clic en el servicio backend ("cotizador-backend")
2. Ve a la pestaña **Variables**

### 2.3 Agregar 3 variables

Haz clic en **Add Variable** y agrega estas 3:

**Variable 1:**
```
MERCADO_PAGO_ACCESS_TOKEN = [tu_access_token_de_arriba]
```

**Variable 2:**
```
MERCADO_PAGO_PUBLIC_KEY = [tu_public_key_de_arriba]
```

**Variable 3:**
```
BASE_URL = https://cotizador-backend-production-31ef.up.railway.app
```

### 2.4 Redeploy
1. Busca el botón **"Redeploy"** en Railway
2. Haz clic para aplicar los cambios
3. Espera a que el estado sea **"Running"** (color verde)
4. **Espera 1-2 minutos** para que se aplique completamente

---

## ✅ PASO 3: Configurar Webhook en Mercado Pago

### 3.1 Ir a Webhooks
- En tu dashboard de Mercado Pago
- Ve a **Configuración** → **Webhooks** (o **Notificaciones**)

### 3.2 Agregar nuevo webhook
1. Botón **"Agregar Webhook"** o **"Add Notification URL"**

2. Rellena:
   - **URL**: `https://cotizador-backend-production-31ef.up.railway.app/api/payment/webhook`
   - **Eventos**: Marca `payment.created` y `payment.updated`

3. Guarda/Agregar

4. Mercado Pago enviará un ping de prueba (se verá en los logs)

---

## 🎉 ¡LISTO! Ahora puedes probar

### Probar en tu app:

1. **Abre tu aplicación** (frontend en Vercel)
2. **Inicia sesión** (o crea una cuenta)
3. **Ve a "Tu Cuenta"** → **"Planes"**
4. **Haz clic en "Contratar"** en el plan Basic o Pro
5. Se debería abrir **Mercado Pago Checkout**

### Para probar sin dinero real:

Usa esta tarjeta:
- **Número**: `4111 1111 1111 1111`
- **Vencimiento**: `11/25`
- **CVV**: `123`
- **Nombre**: Cualquier nombre

> Si usas fecha vencida, el pago será rechazado

---

## 🔍 Verificar que funcione

### En Railway Logs:
1. Ve a tu proyecto en Railway
2. Pestaña **Logs**
3. Busca por: "payment", "webhook", "Pago"

Deberías ver mensajes como:
```
✅ Preferencia creada: 123456789
🔔 Webhook recibido
✅ Pago APROBADO
✨ Suscripción creada
✅ Webhook procesado exitosamente
```

### En tu aplicación:
- Después del pago exitoso, deberías ser redirigido a `dashboard?payment=success`
- Tu suscripción debería aparecer como **ACTIVA**
- Los límites deberían actualizarse

---

## ⚡ Si algo no funciona

### Error: "Sistema de pagos no disponible"
**Causa**: Las variables no están configuradas

**Solución:**
1. Verifica que agregaste las 3 variables en Railway
2. Redeploy nuevamente
3. Espera 2 minutos
4. Intenta de nuevo

### Error: "URL de pago no disponible"
**Causa**: El Access Token es inválido

**Solución:**
1. Verifica el Access Token en Mercado Pago (copia exactamente)
2. Actualiza en Railway
3. Redeploy
4. Intenta de nuevo

### Webhook no dispara
**Causa**: Webhook no configurado en Mercado Pago

**Solución:**
1. Verifica que configuraste el webhook correctamente
2. Verifica la URL exacta
3. Mercado Pago debería confirmar con un "test" (búscalo en logs)

### Pago aprobado pero suscripción no se actualiza
**Causa**: Webhook no está funcionando

**Solución:**
1. Verifica los logs en Railway para errores
2. Verifica que el webhook esté configurado
3. Contacta a Mercado Pago

---

## 📚 Más información

- **Guía completa**: `MERCADO_PAGO_SETUP.md`
- **Guía de testing**: `TESTING_MERCADO_PAGO.md`
- **Resumen técnico**: `MERCADO_PAGO_RESUMEN.md`
- **Guía rápida**: `QUICK_START_MERCADO_PAGO.md`

---

## ✨ Una vez completado esto:

✅ **Sistema de pagos completamente funcional**
✅ **Usuarios pueden comprar planes**
✅ **Suscripciones se crean automáticamente**
✅ **Límites se aplican según plan**
✅ **Webhooks procesan pagos**
✅ **Historial de cotizaciones guardadas**
✅ **Dashboard con múltiples tabs**

---

**¿Necesitas ayuda?** Revisa los archivos `.md` creados o contáctame.

**¡Adelante! 🚀**
