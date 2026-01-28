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

# Instalar poppler para pdf2image
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias instaladas
COPY --from=builder /root/.local /root/.local

# Copiar código de la aplicación
COPY app/ ./app/
COPY run.py .
COPY .env.example .env

# Asegurar que scripts de Python estén en PATH
ENV PATH=/root/.local/bin:$PATH

# Crear directorio para uploads
RUN mkdir -p uploads

# Puerto de la aplicación
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Comando de inicio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
