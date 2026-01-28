# Multi-stage build para optimizar el tamaño
FROM python:3.12-slim as builder

WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primero (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage final
FROM python:3.12-slim

WORKDIR /app

# Instalar curl para healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias instaladas
COPY --from=builder /root/.local /root/.local

# Copiar código de la aplicación
COPY app/ ./app/
COPY run.py .
COPY start.sh .
COPY .env.example .env

# Hacer ejecutable el script de inicio
RUN chmod +x start.sh

# Asegurar que scripts de Python estén en PATH
ENV PATH=/root/.local/bin:$PATH

# Crear directorio para uploads
RUN mkdir -p uploads

# Puerto de la aplicación (Railway usa $PORT)
ENV PORT=8000
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Comando de inicio usando script bash
CMD ["./start.sh"]
