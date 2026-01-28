# Deploy en Vercel - Resumen Rápido

## 1️⃣ Obtener URL de Railway
```
Railway → Tu proyecto → Settings → Domains → Generate Domain
```
Ejemplo: `https://cotizador-backend-production.up.railway.app`

## 2️⃣ Actualizar archivo
Edita `frontend/.env.production`:
```env
VITE_API_URL=https://TU-PROYECTO.up.railway.app/api
```

## 3️⃣ Deploy en Vercel

### Dashboard (más fácil):
1. [vercel.com](https://vercel.com) → **Add New Project**
2. Selecciona tu repo de GitHub
3. **Root Directory**: `frontend` ⚠️
4. **Environment Variables**: 
   - `VITE_API_URL` = `https://tu-proyecto.up.railway.app/api`
5. **Deploy** 🚀

### CLI:
```bash
npm i -g vercel
cd frontend
vercel login
vercel
# Responder wizard
vercel env add VITE_API_URL production
# Pegar URL del backend
vercel --prod
```

## ✅ Listo
- Backend ya tiene CORS configurado para `*.vercel.app`
- Push a `main` = deploy automático
- Vercel te da una URL como: `https://cotizador-frontend.vercel.app`

📖 **Guía completa**: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
