#!/usr/bin/env python3
"""
Punto de entrada principal para la aplicación Cotizador de Útiles Escolares.
Este archivo debe ejecutarse desde la raíz del proyecto.
"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
