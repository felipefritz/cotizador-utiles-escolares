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
COPY start.sh .
COPY .env.example .env

# Hacer ejecutable el script de inicio
RUN chmod +x start.sh

# Asegurar que scripts de Python estén en PATH
ENV PATH=/root/.local/bin:$PATH

# Crear directorio para uploads
RUN mkdir -p uploads

# Puerto de la aplicación (Railway inyecta $PORT)
EXPOSE 8000

# Comando de inicio usando bash explícitamente
CMD ["/bin/bash", "-c", "exec ./start.sh"]
