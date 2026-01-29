# 🔐 Admin Dashboard - Guía de Implementación

## ¿Qué se agregó?

Se implementó un **Dashboard de Administración** completo con interfaz responsive para que los usuarios admin puedan:

✅ **Gestionar Planes** - Editar precios y límites
✅ **Visualizar Usuarios** - Ver todos los usuarios registrados
✅ **Eliminar Usuarios** - Remover usuarios y sus datos
✅ **Consultar Analítica** - Estadísticas de visitas, suscripciones e ingresos

## 📁 Archivos Creados

### Backend
- **`app/routers/admin.py`** - Endpoints para admin (planes, usuarios, analítica)
- **`make_admin.py`** - Script para promover un usuario a admin

### Frontend
- **`frontend/src/pages/AdminDashboard.tsx`** - Interfaz del dashboard con 3 tabs
  - Tab 1: Gestión de Planes
  - Tab 2: Gestión de Usuarios
  - Tab 3: Analítica

## 🔧 Archivos Modificados

### Backend
- **`app/main.py`** - Incluye el router de admin

### Frontend
- **`frontend/src/App.tsx`** - Importa AdminDashboard y agrega la ruta `/admin`
- **`frontend/src/components/Navbar.tsx`** - Agrega botón "Admin" (solo para admins)
- **`frontend/src/contexts/AuthContext.tsx`** - Agregó campo `is_admin` al tipo User

## 🚀 Cómo Usar

### 1. Hacer a un usuario Admin (Local)

```bash
# Desde el directorio raíz del proyecto
python3 make_admin.py tu-email@ejemplo.com
```

**Nota**: El usuario debe tener una cuenta creada primero (login con Google/GitHub).

### 2. En Producción (Railway)

Ejecuta en la terminal de Railway:
```bash
python make_admin.py admin@ejemplo.com
```

O desde tu máquina:
```bash
# Asegúrate de tener las variables de entorno configuradas
python3 make_admin.py tu-email@ejemplo.com
```

### 3. Acceder al Admin Dashboard

1. Login con tu email (Google OAuth)
2. En la navbar verás un botón **"Admin"** (solo si eres admin)
3. Click en el botón para ir a `/admin`
4. Navega entre las 3 tabs

## 📊 Funcionalidades Detalladas

### Tab 1: Gestión de Planes
- Muestra todos los planes (Free, Basic, Pro) en cards
- Botón "Editar" abre un dialog
- Puedes cambiar:
  - Precio (CLP)
  - Max Items
  - Max Providers
  - Monthly Limit

### Tab 2: Gestión de Usuarios
- Tabla con todos los usuarios registrados
- Columnas: Email, Nombre, Proveedor, Admin, Activo, Fecha Registro
- Botón "Eliminar" remueve usuario y sus datos (cotizaciones, pagos, suscripciones)

### Tab 3: Analítica
- **Total Usuarios** - Cantidad de registros
- **Suscripciones Activas** - Suscripciones vigentes
- **Total Visitas** - Basado en cotizaciones guardadas
- **Ingresos Totales** - Suma de pagos completados

## 🔐 Seguridad

- Todos los endpoints de admin requieren `is_admin=True`
- Si intentas acceder sin ser admin → HTTP 403 Forbidden
- La ruta `/admin` redirige a `/` si no eres admin

## 📡 Endpoints de Backend

```
GET  /api/admin/plans                    # Listar planes
PUT  /api/admin/plans/{plan_id}          # Actualizar plan
GET  /api/admin/users                    # Listar usuarios
DELETE /api/admin/users/{user_id}        # Eliminar usuario
GET  /api/admin/analytics                # Estadísticas
GET  /api/admin/dashboard                # Resumen dashboard
```

## 🎨 Diseño Responsivo

El AdminDashboard usa Material-UI Grid y componentes responsive:
- **Mobile** (xs): Cards apiladas, tabla con scroll
- **Tablet** (md): 2 columnas en plans
- **Desktop** (lg): Diseño completo

## 📝 Notas Importantes

1. **El primer usuario admin debe crearse manualmente** usando el script `make_admin.py`
2. **No puedes eliminarte a ti mismo** - El endpoint protege la auto-eliminación
3. **Los datos asociados se eliminan en cascada** - Payments, Subscriptions, SavedQuotes
4. **Las analíticas usan SavedQuote como proxy de visitas** - Puedes extenderlo con una tabla `Visit` si necesitas tracking más detallado

## 🔄 Próximas Mejoras (Opcional)

1. Agregar tabla `Visit` para tracking más granular
2. Charts interactivos (Chart.js/Recharts) para analítica
3. Exportar datos (CSV/PDF)
4. Logs de auditoría (quién cambió qué y cuándo)
5. Autenticación 2FA para admin

## ❓ Problemas Comunes

**P: No veo el botón "Admin" en el navbar**
R: Asegúrate de que:
- Tu usuario sea admin (`is_admin=True`)
- Has hecho login nuevamente después de ejecutar `make_admin.py`
- El campo `is_admin` llegue desde el endpoint `/auth/me`

**P: Recibo "403 Forbidden" al acceder a `/admin`**
R: Probablemente no eres admin. Ejecuta:
```bash
python3 make_admin.py tu-email@ejemplo.com
```

**P: Las estadísticas muestran "0" en todo**
R: Normalmente si no hay datos. Haz una cotización o crea pagos para ver números reales.
