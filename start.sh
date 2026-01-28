#!/bin/bash
# Script de inicio para Railway/Render
# Lee la variable PORT o usa 8000 por defecto

PORT=${PORT:-8000}
echo "🚀 Starting server on port $PORT"

uvicorn app.main:app --host 0.0.0.0 --port $PORT
