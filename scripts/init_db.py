#!/usr/bin/env python3
"""
Script para inicializar la base de datos manualmente.
Útil para desarrollo o si necesitas resetear las tablas.

Uso:
    python scripts/init_db.py
"""

import sys
from pathlib import Path

# Agregar el directorio raíz al path
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

from app.database import init_db, engine, Base
from sqlalchemy import inspect
import os


def main():
    """Inicializar base de datos"""
    db_url = os.getenv("DATABASE_URL", "sqlite:///./cotizador.db")
    
    print(f"🔧 Inicializando base de datos...")
    print(f"📍 Database URL: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    
    try:
        # Crear todas las tablas
        init_db()
        
        # Verificar tablas creadas
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"✅ Base de datos inicializada correctamente")
        print(f"📊 Tablas creadas: {', '.join(tables)}")
        
    except Exception as e:
        print(f"❌ Error al inicializar base de datos: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
