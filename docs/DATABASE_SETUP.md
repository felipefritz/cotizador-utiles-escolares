# Configuración de Base de Datos

## Inicialización Automática

Las tablas de PostgreSQL se crean **automáticamente** cuando inicias el servidor:

```bash
python run.py
# o
uvicorn app.main:app --reload
```

El evento `@app.on_event("startup")` en [app/main.py](../app/main.py) ejecuta `init_db()` que:
1. Lee la variable `DATABASE_URL` (PostgreSQL en Railway, SQLite en local)
2. Crea todas las tablas definidas en [app/database.py](../app/database.py)
3. Muestra "✅ Database initialized successfully" en logs

## Variables de Entorno

### Desarrollo (local)
```env
# No necesitas configurar nada, usa SQLite por defecto
# DATABASE_URL=sqlite:///./cotizador.db (default)
```

### Producción (Railway)
```env
# Railway inyecta automáticamente DATABASE_URL cuando agregas PostgreSQL
DATABASE_URL=postgresql://user:password@hostname:port/database
```

## Modelos Actuales

### User (Tabla `users`)
```python
- id: Integer (Primary Key)
- email: String (Unique)
- username: String (Unique)
- name: String
- avatar_url: String
- password_hash: String
- provider: String (google, twitter, github, local)
- provider_id: String (Unique)
- is_active: Boolean (default=True)
- is_admin: Boolean (default=False)
- created_at: DateTime
- last_login: DateTime
```

## Railway Setup

### Paso 1: Agregar PostgreSQL en Railway
1. Ve a tu proyecto en Railway
2. Click en "New" → "Database" → "Add PostgreSQL"
3. Railway automáticamente crea la variable `DATABASE_URL`

### Paso 2: Variables de Entorno
Asegúrate de tener estas variables en Railway:
```env
DATABASE_URL=postgresql://... (auto-inyectada por Railway)
GROQ_API_KEY=tu_clave_de_groq
SECRET_KEY=tu_clave_secreta_jwt
```

### Paso 3: Deploy
```bash
# Push a GitHub (Railway detecta cambios automáticamente)
git add .
git commit -m "feat: auto PostgreSQL initialization"
git push origin main
```

### Paso 4: Verificar Logs
En Railway, ve a "Deployments" → Click en el último deploy → "View Logs"

Deberías ver:
```
✅ Database initialized successfully
INFO:     Application startup complete.
```

## Inicialización Manual (opcional)

Si necesitas crear las tablas manualmente:

```bash
# Asegúrate de tener DATABASE_URL configurado
export DATABASE_URL="postgresql://user:password@host:port/db"

# Ejecuta el script
python scripts/init_db.py
```

## Migraciones (Futuro)

Para cambios en la estructura (agregar columnas, tablas, etc.), considera usar **Alembic**:

```bash
pip install alembic
alembic init alembic
alembic revision --autogenerate -m "Add new column"
alembic upgrade head
```

## Troubleshooting

### Error: "relation 'users' does not exist"
- El servidor no ejecutó `init_db()` correctamente
- Verifica logs de Railway para ver si hay errores de conexión
- Asegúrate que PostgreSQL está agregado en Railway

### Error: "could not connect to server"
- `DATABASE_URL` está mal configurada
- PostgreSQL no está activo en Railway
- Revisa que la URL tenga formato `postgresql://` (no `postgres://`)

### Error: "no such table: users" (local)
- Estás usando SQLite y el archivo `cotizador.db` no existe
- Ejecuta `python scripts/init_db.py` manualmente
- O reinicia el servidor con `python run.py`

## Testing con PostgreSQL Local

Si quieres probar con PostgreSQL antes de Railway:

```bash
# Instalar PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Linux

# Iniciar servicio
brew services start postgresql  # macOS
sudo service postgresql start  # Linux

# Crear base de datos
createdb cotizador_dev

# Configurar .env
echo "DATABASE_URL=postgresql://localhost/cotizador_dev" >> .env

# Inicializar
python scripts/init_db.py
```
