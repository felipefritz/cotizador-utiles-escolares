# Frontend – Cotizador de Útiles Escolares

React + Vite + TypeScript + Material UI. Wizard en 4 pasos: subir lista → seleccionar ítems y cantidades → elegir tiendas → ver cotización.

## Requisitos

- Node 18+
- Backend FastAPI en marcha (puerto 8000)

## Uso

```bash
cd frontend
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El proxy de Vite envía las peticiones `/api/*` al backend en `http://localhost:8000`.

## Variables de entorno

- `VITE_API_URL`: base URL del API (por defecto `/api` para usar el proxy en desarrollo).

## Formato de archivos

La API acepta listas de útiles en **PDF**, **DOCX**, **XLS** o **XLSX**.
