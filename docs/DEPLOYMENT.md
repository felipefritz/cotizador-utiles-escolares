# 🚀 Guía de Deployment

## Arquitectura Recomendada (100% GRATIS)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Vercel    │─────▶│   Railway    │─────▶│  PostgreSQL │
│  (Frontend) │      │  (Backend)   │      │  (Database) │
└─────────────┘      └──────────────┘      └─────────────┘
    GRATIS              $5/mes gratis          GRATIS
```

## 📦 Backend: Railway (Recomendado)

### Por qué Railway
- ✅ **$5 USD/mes gratis** - Suficiente para empezar
- ✅ **PostgreSQL incluido** - Sin configuración extra
- ✅ **Deploy automático** - Push a GitHub y listo
- ✅ **SSL/HTTPS gratis** - Certificados automáticos
- ✅ **Fácil de usar** - UI intuitiva

### Paso a Paso

1. **Crear cuenta**: https://railway.app/
2. **New Project** → **Deploy from GitHub repo**
3. **Selecciona tu repo**: `cotizador-utiles-escolares`
4. **Railway detecta automáticamente** el `Dockerfile`
5. **Agregar PostgreSQL**: Add Database → PostgreSQL

### Variables de Entorno

```bash
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_tu_clave_de_groq
SECRET_KEY=genera_uno_aleatorio_seguro
# DATABASE_URL se auto-genera al agregar PostgreSQL
```

### Generar SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 🎨 Frontend: Vercel (100% Gratis)

### Por qué Vercel
- ✅ **Gratis ilimitado** - Sin límites de tráfico
- ✅ **CDN global** - Velocidad ultra-rápida
- ✅ **Deploy automático** - En cada push
- ✅ **Preview deployments** - Para PRs
- ✅ **SSL/HTTPS gratis**

### Paso a Paso

1. **Crear cuenta**: https://vercel.com/
2. **Import Project** → Tu repo de GitHub
3. **Configurar**:
   - Framework: **Vite**
   - Root Directory: **frontend**
   - Build Command: **npm run build**
   - Output Directory: **dist**

4. **Variable de entorno**:
   ```bash
   VITE_API_URL=https://tu-proyecto.up.railway.app
   ```

5. **Deploy!**

## 🔄 CI/CD Configurado

Los workflows de GitHub Actions se ejecutan automáticamente:

### `.github/workflows/backend-ci.yml`
- ✅ Lint y validación de código
- ✅ Verificación de imports
- ✅ Security scan
- ✅ Se ejecuta en cada push a `main`

### `.github/workflows/frontend-ci.yml`
- ✅ Build del frontend
- ✅ Lint (si está configurado)
- ✅ Tests (si existen)
- ✅ Se ejecuta en cada push a `main`

## 📋 Checklist de Deploy

### Preparación
- [ ] Push todos los cambios a GitHub
- [ ] Verifica que tests pasen localmente
- [ ] Obtén tu API key de Groq (https://console.groq.com/keys)

### Deploy Backend (Railway)
- [ ] Crear proyecto en Railway
- [ ] Conectar repo de GitHub
- [ ] Agregar PostgreSQL
- [ ] Configurar variables de entorno
- [ ] Esperar el deploy (2-3 minutos)
- [ ] Copiar URL del backend

### Deploy Frontend (Vercel)
- [ ] Crear proyecto en Vercel
- [ ] Configurar root directory: `frontend`
- [ ] Agregar `VITE_API_URL` con URL de Railway
- [ ] Deploy
- [ ] Verificar que funcione

### Verificación
- [ ] Frontend carga correctamente
- [ ] API responde (backend_url/health)
- [ ] Puede subir archivos
- [ ] IA funciona (Groq)
- [ ] Login funciona

## 💡 Alternativas

### Render (Si prefieres todo en un lugar)
```bash
# Backend y base de datos juntos
# Tier gratuito disponible
# Se duerme después de 15 min sin uso
```

**Pasos:**
1. Crear cuenta: https://render.com/
2. New → Web Service
3. Conectar GitHub
4. Render detecta `render.yaml`
5. Agregar `GROQ_API_KEY` en variables

### Fly.io (Para usuarios avanzados)
```bash
# $5/mes gratis
# Múltiples regiones
# Requiere CLI
```

## 🚨 Problemas Comunes

### Backend no inicia
```bash
# Ver logs en Railway
Railway → tu proyecto → Deployments → View Logs

# Verificar variables
Settings → Variables
```

### Frontend no conecta
```bash
# Verificar VITE_API_URL en Vercel
Settings → Environment Variables

# Debe ser: https://tu-proyecto.up.railway.app
# (sin / al final)
```

### Error de CORS
Asegúrate que en `app/main.py` el CORS incluya tu dominio de Vercel:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://tu-app.vercel.app"  # Agregar esto
    ],
    ...
)
```

## 💰 Costos

| Servicio | Tier Gratuito | Suficiente para |
|----------|---------------|-----------------|
| **Railway** | $5 créditos/mes | ~500 hrs de uptime |
| **Vercel** | Ilimitado | ∞ usuarios |
| **Groq** | Ilimitado | ∞ requests |
| **PostgreSQL** | 1GB en Railway | Miles de cotizaciones |

**Total: $0-5 USD/mes** 🎉

## 📚 Recursos

- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Actions](https://docs.github.com/actions)
- [Groq API](https://console.groq.com/docs)

---

**¿Listo para desplegar?** Sigue los pasos y tendrás tu app en producción en 15 minutos! 🚀
