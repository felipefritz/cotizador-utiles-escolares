# Configuración de WhatsApp

## Botón flotante de WhatsApp

El sitio ahora incluye un botón flotante de WhatsApp en la esquina inferior derecha que permite a los usuarios contactarte directamente.

### Configuración del Número

**Opción 1: Variable de Entorno (Recomendado para Vercel)**

1. En Vercel, ve a tu proyecto → Settings → Environment Variables
2. Agrega una nueva variable:
   - **Name:** `VITE_WHATSAPP_NUMBER`
   - **Value:** Tu número en formato internacional sin + ni espacios
   - **Example:** `56912345678` (para +56 9 1234 5678)
3. Redeploy el proyecto

**Opción 2: Editar directamente el código**

Edita `frontend/src/components/WhatsAppButton.tsx` línea 5:
```typescript
const phoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '56912345678' // ← CAMBIA AQUÍ
```

### Formato del Número

El número debe estar en formato internacional **SIN** el signo + y **SIN** espacios:

| Formato Original | Formato Correcto |
|-----------------|------------------|
| +56 9 1234 5678 | 56912345678 |
| +1 (555) 123-4567 | 15551234567 |
| +34 612 34 56 78 | 34612345678 |

### Personalizar el Mensaje

Edita `frontend/src/components/WhatsAppButton.tsx` línea 6:
```typescript
const message = encodeURIComponent('Tu mensaje personalizado aquí')
```

### Características

✅ Botón flotante en esquina inferior derecha
✅ Color verde WhatsApp oficial (#25D366)
✅ Animación de pulso para llamar la atención
✅ Tooltip al hacer hover
✅ Responsive en móviles y desktop
✅ Abre WhatsApp Web en desktop
✅ Abre WhatsApp app en móviles
✅ Mensaje predefinido personalizable

### Estilos Personalizables

Puedes modificar la posición y estilos en `WhatsAppButton.tsx`:

```typescript
sx={{
  position: 'fixed',
  bottom: 24,    // Distancia desde abajo
  right: 24,     // Distancia desde la derecha
  // ... más estilos
}}
```

### Desactivar Temporalmente

Para ocultar el botón sin eliminarlo, comenta la línea en `App.tsx`:

```typescript
// <WhatsAppButton />
```

### Deployment

El botón está incluido automáticamente en todas las páginas excepto la página de login.

Para Vercel, recuerda configurar la variable de entorno `VITE_WHATSAPP_NUMBER` en el dashboard.
