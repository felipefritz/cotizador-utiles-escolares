# 🚀 Deploy Frontend en Vercel

## Paso 1: Obtener URL de Railway

Primero necesitas la URL de tu backend en Railway:

1. Ve a [railway.app](https://railway.app) → Tu proyecto
2. Click en tu servicio backend
3. Pestaña **"Settings"**
4. Sección **"Domains"** → Click en **"Generate Domain"**
5. Copia la URL (ejemplo: `https://cotizador-utiles-production.up.railway.app`)

## Paso 2: Actualizar .env.production

Edita `frontend/.env.production`:

```env
VITE_API_URL=https://TU-PROYECTO.up.railway.app/api
```

**⚠️ IMPORTANTE**: Reemplaza `TU-PROYECTO.up.railway.app` con tu URL real de Railway.

## Paso 3: Deploy en Vercel

### Opción A: Desde el Dashboard de Vercel (Recomendado)

1. Ve a [vercel.com](https://vercel.com)
2. Click en **"Add New Project"**
3. **Import Git Repository**:
   - Selecciona tu repositorio de GitHub
   - Si es tu primera vez, autoriza Vercel en GitHub
4. **Configure Project**:
   - **Framework Preset**: Vite (se detecta automáticamente)
   - **Root Directory**: `frontend` ← **MUY IMPORTANTE**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - Click en **"Environment Variables"**
   - Agrega: `VITE_API_URL` = `https://tu-proyecto.up.railway.app/api`
6. Click en **"Deploy"** 🚀

### Opción B: Desde la CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Ir a la carpeta frontend
cd frontend

# Deploy
vercel

# Seguir el wizard:
# ? Set up and deploy "~/cotizador-utiles/frontend"? [Y/n] y
# ? Which scope? [tu-usuario]
# ? Link to existing project? [y/N] n
# ? What's your project's name? cotizador-frontend
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n

# Agregar variable de entorno
vercel env add VITE_API_URL production
# Pegar: https://tu-proyecto.up.railway.app/api

# Deploy a producción
vercel --prod
```

## Paso 4: Verificar el Deploy

1. Vercel te dará una URL (ejemplo: `https://cotizador-frontend.vercel.app`)
2. Abre la URL en el navegador
3. Abre **DevTools Console** (F12)
4. Busca errores de CORS o API

### Si hay errores de CORS:

El backend ya está configurado para aceptar `*.vercel.app`, pero si tienes problemas:

1. Ve a Railway → Variables de entorno
2. Agrega (si no existe):
   ```env
   FRONTEND_URL=https://tu-proyecto.vercel.app
   ```
3. El backend se reiniciará automáticamente

## Paso 5: Configurar Dominio Custom (Opcional)

1. En Vercel → Tu proyecto → **Settings** → **Domains**
2. Click en **"Add"**
3. Ingresa tu dominio: `cotizador.tudominio.com`
4. Sigue las instrucciones para configurar DNS
5. Actualiza el CORS en Railway si es necesario

## Paso 6: Redeploys Automáticos

Vercel se conecta a tu repositorio de GitHub:

- **Push a `main`** → Deploy automático a producción
- **Push a otra rama** → Preview deployment
- **Pull Request** → Preview deployment

## Variables de Entorno en Vercel

Puedes agregar/editar variables en:

**Dashboard**: Proyecto → Settings → Environment Variables

Variables disponibles:
- `VITE_API_URL` - URL del backend (REQUERIDA)
- Cualquier otra variable `VITE_*` que necesites

**⚠️ IMPORTANTE**: 
- Las variables `VITE_*` se incrustan en el build
- Cambiar una variable requiere **redeploy**
- Para secretos sensibles del backend, úsalos solo en Railway

## Troubleshooting

### Error: "API calls failing"
- ✅ Verifica que `VITE_API_URL` esté configurada correctamente
- ✅ Verifica que el backend en Railway esté corriendo
- ✅ Verifica la URL: debe terminar en `/api` (sin barra final)

### Error: "CORS policy"
- ✅ El backend ya permite `*.vercel.app`
- ✅ Si usas dominio custom, agrégalo en `app/main.py`
- ✅ Redeploy el backend en Railway después de cambios

### Error: "Page not found on refresh"
- ✅ Ya está configurado en `vercel.json` con rewrites
- ✅ Si persiste, verifica que `vercel.json` existe en `frontend/`

### Build falla en Vercel
- ✅ Verifica que **Root Directory** sea `frontend`
- ✅ Verifica que `package.json` tenga el script `build`
- ✅ Revisa los logs de build en Vercel

## Estructura Final

```
Tu repositorio:
├── app/              # Backend (Railway)
├── frontend/         # Frontend (Vercel)
│   ├── .env.development
│   ├── .env.production  ← URL de Railway aquí
│   └── vercel.json      ← Config de Vercel
├── ...
```

## URLs Finales

- **Backend (Railway)**: `https://tu-proyecto.up.railway.app`
- **Frontend (Vercel)**: `https://cotizador-frontend.vercel.app`
- **API Health**: `https://tu-proyecto.up.railway.app/health`

## Comandos Útiles

```bash
# Ver deployments
vercel ls

# Ver logs
vercel logs

# Redeploy
vercel --prod

# Remove deployment
vercel rm [deployment-url]
```

---

**¡Listo!** Tu frontend estará desplegado en Vercel conectándose al backend en Railway 🎉
