# Railway Healthcheck Configuration

## El Problema

Railway usa un sistema **separado** para healthchecks. El HEALTHCHECK en Dockerfile es para Docker local, NO para Railway.

## La Solución

### 1. En Railway Dashboard (IMPORTANTE)

1. Ve a tu proyecto → Selecciona el servicio backend
2. Click en **"Settings"** (engranaje)
3. Busca **"Healthcheck"** en la sección de Networking
4. Configura:
   - **Health Path**: `/health`
   - **Health Port**: Dejar vacío (usa el puerto que escucha tu app)
   - **Healthcheck Timeout**: `60` segundos (por defecto es 300)

### 2. En tu aplicación

El endpoint `/health` ya existe en `app/main.py`:

```python
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "cotizador-utiles"}
```

✅ Esto devuelve status 200 automáticamente.

### 3. Railway hace el resto

Railway usará el hostname `healthcheck.railway.app` para testear tu endpoint:

```
GET http://healthcheck.railway.app:$PORT/health
```

Si recibe `200`, el deploy está listo.

## Verificación Local

```bash
# Iniciar servidor
python run.py

# En otra terminal
curl -v http://localhost:8000/health
# Debe responder: {"status": "healthy", "service": "cotizador-utiles"}
```

## Notas Importantes

- ⚠️ Railway **SOLO** usa healthcheck durante el **deployment inicial**
- ⚠️ NO monitorea continuously después que está live
- ⚠️ El hostname para healthcheck es `healthcheck.railway.app` (no localhost)
- ✅ Si tu app está restringida por hostname, eso causaría errores

## Si sigue fallando

1. Revisa logs de Railway → Deployments → Ver logs
2. Verifica que `PORT` environment variable está siendo usada
3. Asegúrate que `start.sh` está ejecutable (`chmod +x start.sh`)
4. Prueba localmente: `curl http://localhost:8000/health`
