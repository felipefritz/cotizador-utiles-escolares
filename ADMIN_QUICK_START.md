# 🔐 Admin Dashboard - Guía Rápida

## ⚡ Quick Start (5 minutos)

### 1. Hacer admin a un usuario

```bash
# En tu terminal local
python3 make_admin.py tu-email@gmail.com
```

### 2. Logout y Login nuevamente
- Navbar → Avatar → Logout
- /login → Google OAuth
- Deberías ver un botón "Admin" naranja en el navbar

### 3. Click en "Admin"
- Dashboard se abre
- 3 tabs: Planes, Usuarios, Analítica

---

## 📊 Lo que cada tab hace

### 🏷️ Tab 1: Planes
```
┌─────────────────┐
│  PLAN: FREE     │  ← Click "Editar"
│ $0 lifetime     │
│ 30 items        │
│ 3 providers     │
└─────────────────┘
```
- Edita precio, límites
- Guardas cambios
- Aplican a nuevas suscripciones

### 👥 Tab 2: Usuarios
```
Email          │ Nombre │ Proveedor │ Admin │ Activo │ Fecha
user@gmail.com │ John   │ google    │ ✓     │ ✓      │ 15/01
smith@email.com│ Sarah  │ github    │ -     │ ✓      │ 20/01
```
- Ve todos los usuarios
- Botón "Eliminar" por fila
- Elimina usuario + sus datos

### 📈 Tab 3: Analítica
```
Total Usuarios: 42
Suscripciones Activas: 8
Total Visitas: 523
Ingresos Totales: $79,920
```
- Métricas solo lectura
- Se actualiza al cambiar de tab
- Refuerza que eres admin 💪

---

## 🔧 Troubleshooting

### ❌ No veo botón "Admin"

**Posibles causas:**
1. No hiciste `make_admin.py` → Ejecuta el script
2. No hiciste logout/login → Recarga las credenciales
3. Usuario no existe → Crea cuenta primero

**Solución:**
```bash
# 1. Confirma que el usuario existe
sqlite3 cotizador.db "SELECT email, is_admin FROM users WHERE email='tu-email@gmail.com';"

# 2. Si no existe, crea cuenta primero
# Ve a /login y haz OAuth

# 3. Luego ejecuta make_admin
python3 make_admin.py tu-email@gmail.com

# 4. Logout y Login nuevamente en la app
```

### ❌ Recibo 403 Forbidden

Significa que el servidor cree que NO eres admin.

**Solución:**
```bash
# Verifica en la DB
sqlite3 cotizador.db "UPDATE users SET is_admin=1 WHERE email='tu-email@gmail.com';"

# O usa el script
python3 make_admin.py tu-email@gmail.com
```

### ❌ Las analíticas muestran 0

Es normal si acabas de empezar. Crea una cotización para ver números reales.

---

## 📱 Diseño Responsivo

### Mobile (< 600px)
```
Admin Dashboard
[Plans] [Users] [Analytics]

┌─────────────────┐
│  FREE           │
│  $0             │
│  [Editar]       │
└─────────────────┘
```

### Tablet (600-960px)
```
┌──────────┬──────────┐
│ FREE     │ BASIC    │
│ $0       │ $4,990   │
└──────────┴──────────┘
```

### Desktop (> 960px)
```
┌────────┬────────┬────────┐
│ FREE   │ BASIC  │ PRO    │
│ $0     │ $4,990 │ $14,990│
└────────┴────────┴────────┘
```

---

## 🚀 Deployment (Railway/Vercel)

### Backend (Railway)
```bash
# make_admin.py ya está en el repo
# Ejecuta en la terminal de Railway:
python make_admin.py admin@ejemplo.com
```

### Frontend (Vercel)
```bash
# Vercel buildea automáticamente
# No necesitas hacer nada
# Los cambios se despliegan al push
```

---

## 🎯 Casos de Uso Reales

### Caso 1: Cambiar precios de planes
1. Admin → Planes
2. Click "Editar" en "BASIC"
3. Cambiar $4,990 → $5,990
4. Click "Guardar"
5. Listo, afecta nuevas suscripciones

### Caso 2: Ver usuarios activos
1. Admin → Usuarios
2. Filtra por "Activo = ✓"
3. Ve todos los usuarios pagantes
4. Nota: Email, Proveedor (Google/GitHub), Fecha

### Caso 3: Consultar ingresos
1. Admin → Analítica
2. Ve "Ingresos Totales: $X"
3. Ve también "Suscripciones Activas"
4. Calcula LTV (Lifetime Value)

---

## 📚 Documentos Relacionados

- **ADMIN_DASHBOARD_SETUP.md** - Setup completo y troubleshooting detallado
- **ADMIN_IMPLEMENTATION_SUMMARY.md** - Detalles técnicos y arquitectura
- **app/routers/admin.py** - Código backend de los endpoints
- **frontend/src/pages/AdminDashboard.tsx** - Código frontend del dashboard

---

## 💡 Tips & Tricks

✅ **Tip 1**: Puedes hacer admin a múltiples usuarios
```bash
python3 make_admin.py user1@gmail.com
python3 make_admin.py user2@gmail.com
```

✅ **Tip 2**: Los precios se actualizan inmediatamente
- No necesitas reiniciar el servidor
- Nuevas suscripciones usan el nuevo precio

✅ **Tip 3**: No puedes eliminarte a ti mismo
- Protección incorporada contra accidents

✅ **Tip 4**: Usa Tab 3 para monitorear salud del negocio
- Total Usuarios = Growth metric
- Ingresos = Revenue metric
- Suscripciones Activas = Churn metric

---

## ⚙️ Configuración Avanzada (Optional)

### Agregar más admins
```bash
for email in admin1@gmail.com admin2@gmail.com; do
  python3 make_admin.py "$email"
done
```

### Trackear visitas granulares
La tabla `PageVisit` ya existe en DB pero es opcional de usar. Para habilitarla, un endpoint podría hacer:

```python
# Cuando usuario visita /dashboard
db.add(PageVisit(
    user_id=user.id,
    page="/dashboard",
    user_agent=request.headers.get("user-agent"),
    ip_address=request.client.host
))
```

---

## 🔗 URLs Importantes

| URL | Acceso | Descripción |
|-----|--------|-------------|
| `/` | Cualquiera | Home |
| `/dashboard` | Usuario logueado | Mi dashboard |
| `/admin` | Solo admin | Admin panel |
| `/login` | Anónimo | Iniciar sesión |

---

## ✨ Features Incluidos

- ✅ Gestión de planes (CRUD)
- ✅ Visualización de usuarios
- ✅ Eliminar usuarios
- ✅ Analítica básica
- ✅ Responsive design
- ✅ Dark mode compatible
- ✅ Loading states
- ✅ Error handling
- ✅ Confirmaciones antes de acciones destructivas

---

**Última actualización**: 2025-01-22
**Estado**: ✅ Ready for Production
