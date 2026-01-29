# 🔄 Pasos para Migrar la Base de Datos

Después de descargar los cambios, necesitas ejecutar estos pasos para aplicar las nuevas tablas:

## Opción 1: Reiniciar la aplicación (Más simple)

Si estás en desarrollo, simplemente:

```bash
# 1. Elimina el archivo de la BD
rm cotizador.db

# 2. Reinicia la aplicación
python run.py
```

La BD se recreará automáticamente con las nuevas tablas.

## Opción 2: Migración Manual (Para Producción)

Si tienes datos importantes en la BD:

```bash
# 1. Haz backup de tu BD
cp cotizador.db cotizador.db.backup

# 2. Abre Python en la carpeta del proyecto
python3

# 3. Ejecuta esto en la terminal Python:
from app.database import engine, Base
Base.metadata.create_all(bind=engine)
exit()
```

## Opción 3: Con Railway/Render (PostgreSQL)

Las migraciones se aplican automáticamente cuando se redeploy la aplicación:

```bash
# En el archivo de deployment (railway.json o render.yaml),
# la tabla se crea automáticamente al iniciar la app
```

## ✅ Verificar que funcionó

1. Inicia la app: `python run.py`
2. Ve a Admin Dashboard → Pestaña "Sugerencias"
3. Debería estar vacía (sin errores)
4. En usuarios logueados, el botón "Sugerir Tienda" debería funcionar

## 🐛 Si algo falla

1. Revisa que `app/database.py` tenga el import de `ProviderSuggestion`
2. Verifica que `app/main.py` importe los schemas correctamente
3. Borra la BD y reinicia si es desarrollo
4. Contacta soporte si es producción
