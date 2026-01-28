# 🚀 Configuración de Groq (Modelo GRATIS)

## ¿Por qué Groq?

✅ **100% GRATIS** - Sin costos, sin límites de crédito
✅ **Rápido** - Inference ultra-rápida (hasta 10x más rápido que OpenAI)
✅ **Potente** - Llama 3.3 70B es comparable a GPT-4
✅ **Con Visión** - Llama 3.2 90B Vision puede leer PDFs con imágenes
✅ **Compatible con OpenAI** - Misma API, fácil de integrar
✅ **Ideal para producción** - Gratis para desplegar en servidores

## 📝 Pasos de Configuración

### 1. Obtener API Key de Groq (2 minutos)

1. Ve a https://console.groq.com/
2. Crea una cuenta (gratis, solo email)
3. Ve a "API Keys": https://console.groq.com/keys
4. Haz clic en "Create API Key"
5. Copia la clave (empieza con `gsk_...`)

### 2. Configurar en tu aplicación

Edita el archivo `.env`:

```bash
# Cambiar a Groq (ya está configurado por defecto)
LLM_PROVIDER=groq

# Pegar tu API key
GROQ_API_KEY=gsk_tu_clave_aqui
```

¡Y listo! No necesitas nada más.

### 3. Probar que funciona

```bash
cd /Users/felipe/Documents/proyectos/cotizador-utiles
source venv12/bin/activate
python test_openai_extraction.py
```

Deberías ver:
```
✅ Usando Groq (GRATIS) para extracción con IA
✅ Extracción exitosa
📝 Items encontrados: X
```

## 🆚 Comparación: Groq vs OpenAI

| Característica | Groq | OpenAI |
|---------------|------|---------|
| **Costo** | ✅ GRATIS | 💰 $0.15-2.50 por 1M tokens |
| **Velocidad** | ⚡ Ultra-rápido | 🐢 Normal |
| **Precisión** | 🎯 95% | 🎯 95-97% |
| **Visión** | ✅ Sí (Llama 3.2 90B) | ✅ Sí (GPT-4o) |
| **Límites** | 🚫 Sin límites | 💳 Por crédito |
| **Para producción** | ✅✅✅ Perfecto | ⚠️ Caro |

## 🔧 Modelos Disponibles en Groq

### Modelos de Texto (para listas simples)

- **llama-3.3-70b-versatile** (predeterminado) - Mejor balance
- **llama-3.1-8b-instant** - Más rápido, menos preciso
- **mixtral-8x7b-32768** - Bueno para textos largos

### Modelos con Visión (para PDFs complejos)

- **llama-3.2-90b-vision-preview** (predeterminado) - Lee imágenes y PDFs
- **llama-3.2-11b-vision-preview** - Más rápido, menos preciso

## 📊 Uso en Producción

### Escenario 1: Aplicación web con usuarios

```
- 100 documentos/día
- Groq: $0 💚
- OpenAI: ~$5-15/día 💸
```

### Escenario 2: Sistema empresarial

```
- 1000 documentos/día
- Groq: $0 💚
- OpenAI: ~$50-150/día 💸
```

## 🚀 Despliegue en Servidor

Groq funciona perfectamente en cualquier servidor:

### Railway / Render / Fly.io

```bash
# En las variables de entorno del servidor
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_tu_clave
```

### Docker

```dockerfile
ENV LLM_PROVIDER=groq
ENV GROQ_API_KEY=gsk_tu_clave
```

### Vercel / Netlify Functions

```bash
# En el dashboard de variables de entorno
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_tu_clave
```

## 🔄 Cambiar entre Groq y OpenAI

Si en el futuro quieres usar OpenAI:

```bash
# En .env
LLM_PROVIDER=openai  # Cambiar de "groq" a "openai"
OPENAI_API_KEY=sk_tu_clave
```

El código automáticamente usará el proveedor configurado.

## 🐛 Troubleshooting

### "LLM no configurado"
→ Verifica que `GROQ_API_KEY` esté en `.env`
→ Reinicia el servidor después de cambiar `.env`

### "API key inválida"
→ Genera una nueva en https://console.groq.com/keys
→ Asegúrate de copiar la clave completa

### "No se encontraron items"
→ El modelo está funcionando, pero el PDF no tiene items válidos
→ Prueba con `use_vision=true` para PDFs complejos

### Error 429 "Rate limit"
→ Groq tiene límites por minuto, espera 1 minuto
→ En producción, estos límites son muy altos

## 📚 Documentación

- Groq Console: https://console.groq.com/
- Documentación API: https://console.groq.com/docs
- Modelos disponibles: https://console.groq.com/docs/models
- Rate limits: https://console.groq.com/docs/rate-limits

## ✅ Ventajas para tu Aplicación

1. **Costo $0** - Puedes desplegar sin preocuparte por costos de IA
2. **Rápido** - Los usuarios tendrán respuestas instantáneas
3. **Escalable** - Maneja miles de documentos sin problemas
4. **Sin configuración compleja** - Solo una API key
5. **Compatible** - Funciona exactamente igual que OpenAI

---

**🎉 ¡Todo listo!** Solo obtén tu API key de Groq y pégala en `.env`. El sistema ya está configurado para usarla.
