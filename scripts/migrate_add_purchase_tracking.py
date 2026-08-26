#!/usr/bin/env python3
"""
Script de migración para agregar columnas de seguimiento de compras
Ejecutar: python scripts/migrate_add_purchase_tracking.py
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Agregar el directorio raíz al path
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))
load_dotenv(root_dir / ".env")

from sqlalchemy import text
from app.database import engine

def migrate():
    """Agregar columnas faltantes a saved_quotes"""
    
    migrations = [
        # Agregar purchased_items (JSON)
        """
        ALTER TABLE saved_quotes 
        ADD COLUMN IF NOT EXISTS purchased_items JSON DEFAULT '{}';
        """,
        
        # Agregar selected_provider
        """
        ALTER TABLE saved_quotes 
        ADD COLUMN IF NOT EXISTS selected_provider VARCHAR(100);
        """,
        
        # Agregar status
        """
        ALTER TABLE saved_quotes 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
        """,
    ]
    
    print("🔄 Iniciando migración...")
    
    with engine.connect() as conn:
        for i, migration in enumerate(migrations, 1):
            try:
                print(f"  Ejecutando migración {i}/{len(migrations)}...")
                conn.execute(text(migration))
                conn.commit()
                print(f"  ✅ Migración {i} completada")
            except Exception as e:
                print(f"  ⚠️  Error en migración {i}: {e}")
                # Continuar con las siguientes migraciones
    
    print("✅ Migración completada exitosamente")

if __name__ == "__main__":
    migrate()
