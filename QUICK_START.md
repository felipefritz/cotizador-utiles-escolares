# 🚀 Quick Start - Nuevas Features

## Instalación Rápida

```bash
# 1. Asegurate de tener Python 3.9+
python --version

# 2. Instala dependencias (si es necesario)
pip install -r requirements.txt

# 3. Migra BD (desarrollo)
rm cotizador.db    # elimina la BD antigua
python run.py      # se crea automáticamente

# 4. Frontend
cd frontend
npm install
npm run dev
```

## URLs Importantes

```
🏠 Home: http://localhost:5173
📊 Admin: http://localhost:5173/admin
🔑 API: http://localhost:8000/api
```

## Test Rápido

### 1. Sugerir un proveedor

```javascript
// En consola del navegador en HomePage
const token = localStorage.getItem('token');
fetch('http://localhost:8000/api/suggestions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    provider_name: 'Test Shop',
    description: 'Test description',
    website_url: 'https://test.com',
    email_contact: 'test@test.com'
  })
})
.then(r => r.json())
.then(console.log)
```

### 2. Ver sugerencias (admin)

```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:8000/api/suggestions/admin/all', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(console.log)
```

### 3. Cambiar plan de usuario (admin)

```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:8000/api/admin/users/1/plan', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    plan_id: 2  // 1=free, 2=basic, 3=pro
  })
})
.then(r => r.json())
.then(console.log)
```

## Archivos Clave

```
Backend:
├── app/database.py           ← ProviderSuggestion tabla
├── app/schemas.py            ← Schemas de sugerencias
├── app/main.py               ← 5 nuevos endpoints
└── requirements.txt          ← Deps (sin cambios)

Frontend:
├── src/App.tsx               ← ProviderSuggestionForm importado
├── src/pages/HomePage.tsx    ← Nuevo diseño moderno
├── src/pages/AdminDashboard.tsx ← Rediseñado responsive
└── src/components/ProviderSuggestionForm.tsx ← Nuevo componente
```

## Cambios en BD

Solo se agregó una tabla:

```sql
CREATE TABLE provider_suggestions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL FOREIGN KEY REFERENCES users(id),
    provider_name VARCHAR NOT NULL,
    description TEXT NOT NULL,
    website_url VARCHAR,
    email_contact VARCHAR,
    status VARCHAR DEFAULT 'processing',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_suggestions_user_id ON provider_suggestions(user_id);
CREATE INDEX idx_provider_suggestions_status ON provider_suggestions(status);
CREATE INDEX idx_provider_suggestions_created_at ON provider_suggestions(created_at);
```

## Env Variables (sin cambios)

Usa las mismas que ya tienes:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=...
DATABASE_URL=sqlite:///./cotizador.db
SECRET_KEY=...
# etc
```

## Debugging

### Backend

```bash
# Ver logs
python run.py

# Debug con pdb
python -m pdb run.py
```

### Frontend

```bash
# Console (F12)
# Network tab para ver requests
# React DevTools extension
```

### BD

```bash
# SQLite
sqlite3 cotizador.db

# Ver tabla
.tables
SELECT * FROM provider_suggestions;

# PostgreSQL (si es Render/Railway)
psql $DATABASE_URL
\dt  -- ver tablas
SELECT * FROM provider_suggestions;
```

## Comandos Útiles

```bash
# Resetear BD (desarrollo)
rm cotizador.db

# Rebuild frontend
cd frontend && npm run build

# Test individual endpoint
curl -X GET http://localhost:8000/api/plans

# Ver procesos
lsof -i :8000  # Backend
lsof -i :5173  # Frontend
```

## Deploy a Render/Railway

```bash
# 1. Push a GitHub
git add .
git commit -m "Add suggestions system and modern UI"
git push

# 2. Deploy automático (si está configurado)
# El deployment se ejecuta automáticamente

# 3. BD migra automáticamente en init_db()
# Verificar en logs que create tables succeeded
```

## Checklist antes de Deploy

- ✅ Tests locales pasados
- ✅ Sin errores en consola (F12)
- ✅ Admin puede ver sugerencias
- ✅ Cambio de plan funciona
- ✅ HomePage se ve bien en móvil
- ✅ No hay cambios en .env requeridos
- ✅ BD se migra automáticamente

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Cannot find module" | `npm install` en frontend |
| CORS error | Verificar CORS middleware en main.py |
| BD locked | Cierra todas las conexiones, borra cotizador.db |
| Token inválido | Logout y login nuevamente |
| Componente no renderiza | Verificar imports en App.tsx |
| Endpoint 404 | Verificar ruta en main.py |

## Recursos

- [MUI Docs](https://mui.com)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [React Docs](https://react.dev)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org)

---

**¿Preguntas?** Revisar USAGE_GUIDE.md para detalles de features específicas.
