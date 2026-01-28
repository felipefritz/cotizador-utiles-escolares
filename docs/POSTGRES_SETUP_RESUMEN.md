# ✅ Resumen de Configuración de Base de Datos

## Qué se Hizo

### 1. ✅ Inicialización Automática
- **Agregado evento `@app.on_event("startup")`** en [app/main.py](../app/main.py)
- Las tablas se crean automáticamente al iniciar el servidor
- Logs muestran: "✅ Database initialized successfully"

### 2. ✅ Soporte PostgreSQL + SQLite
- **Actualizado [app/database.py](../app/database.py)**:
  - Lee `DATABASE_URL` de variables de entorno
  - SQLite en desarrollo (default: `sqlite:///./cotizador.db`)
  - PostgreSQL en producción (Railway/Render)
  - Auto-conversión de `postgres://` a `postgresql://`

### 3. ✅ Dependencias
- **Agregado `psycopg2-binary==2.9.9`** a [requirements.txt](../requirements.txt)
- Driver PostgreSQL para SQLAlchemy

### 4. ✅ Script Manual
- **Creado [scripts/init_db.py](../scripts/init_db.py)**
- Para inicializar manualmente si es necesario
- Muestra tablas creadas

### 5. ✅ Documentación Completa
- **Creado [docs/DATABASE_SETUP.md](../docs/DATABASE_SETUP.md)**
- Guía completa de configuración
- Troubleshooting común
- Ejemplos para Railway

## Respuesta a Tu Pregunta

### ❓ "¿En Postgres debo crear tablas lo que me pide Railway?"

**NO, las tablas se crean automáticamente** ✨

Railway solo necesita:
1. **Agregar PostgreSQL**: New → Database → Add PostgreSQL
2. **Variables de entorno**:
   ```env
   DATABASE_URL=postgresql://... (auto-inyectada)
   GROQ_API_KEY=gsk_...
   SECRET_KEY=...
   ```
3. **Deploy**: Push a GitHub → Railway despliega automáticamente

Al iniciar, el servidor:
- Lee `DATABASE_URL` de Railway
- Ejecuta `init_db()` automáticamente
- Crea la tabla `users` con todos los campos
- Muestra en logs: "✅ Database initialized successfully"

## Pasos para Railway

### 1️⃣ Agregar PostgreSQL
```
Railway Dashboard → Tu Proyecto → New → Database → Add PostgreSQL
```

### 2️⃣ Configurar Variables
```
Settings → Variables → Add Variables:
- GROQ_API_KEY=gsk_tu_clave_aqui
- SECRET_KEY=tu-secreto-muy-seguro
- LLM_PROVIDER=groq
```

### 3️⃣ Deploy
```bash
git add .
git commit -m "feat: auto PostgreSQL initialization"
git push origin main
```

### 4️⃣ Verificar
```
Deployments → Click en último deploy → View Logs
```

Deberías ver:
```
🔧 Inicializando base de datos...
✅ Database initialized successfully
INFO:     Application startup complete.
```

## Tablas Creadas

### `users` (actual)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR UNIQUE,
    username VARCHAR UNIQUE,
    name VARCHAR,
    avatar_url VARCHAR,
    password_hash VARCHAR,
    provider VARCHAR,
    provider_id VARCHAR UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP DEFAULT NOW()
);
```

## Archivos Modificados

1. ✅ [app/main.py](../app/main.py)
   - Líneas ~49-58: Evento startup con init_db()

2. ✅ [app/database.py](../app/database.py)
   - Líneas 1-26: Soporte PostgreSQL + SQLite

3. ✅ [requirements.txt](../requirements.txt)
   - Línea 13: psycopg2-binary==2.9.9

4. ✅ [scripts/init_db.py](../scripts/init_db.py)
   - Script completo de inicialización manual

5. ✅ [docs/DATABASE_SETUP.md](../docs/DATABASE_SETUP.md)
   - Documentación detallada

6. ✅ [README.md](../README.md)
   - Actualizado con referencias

## Testing Local

```bash
# Instalar nueva dependencia
pip install psycopg2-binary==2.9.9

# Probar script manual
python scripts/init_db.py

# Debería mostrar:
# ✅ Base de datos inicializada correctamente
# 📊 Tablas creadas: users
```

## Próximos Pasos

1. **Instalar dependencia**: `pip install -r requirements.txt`
2. **Push a GitHub**: `git push origin main`
3. **Configurar Railway**: Agregar PostgreSQL + Variables
4. **Verificar logs**: Buscar "✅ Database initialized successfully"

---

**¡No necesitas crear tablas manualmente!** 🎉
