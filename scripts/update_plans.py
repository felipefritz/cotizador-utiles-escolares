#!/usr/bin/env python
"""Script para actualizar los límites de los planes existentes"""

import sys
sys.path.insert(0, '/Users/felipe/Documents/proyectos/cotizador-utiles')

from app.database import SessionLocal, Plan

def update_plans():
    db = SessionLocal()
    try:
        # Actualizar plan free
        free_plan = db.query(Plan).filter(Plan.name == "free").first()
        if free_plan:
            print(f"Actualizando plan FREE: {free_plan.max_items} items, {free_plan.max_providers} providers")
            free_plan.max_items = 30
            free_plan.max_providers = 3
            print(f"  → Nuevo: 30 items, 3 providers")
        
        # Actualizar plan basic
        basic_plan = db.query(Plan).filter(Plan.name == "basic").first()
        if basic_plan:
            print(f"Actualizando plan BASIC: {basic_plan.max_items} items, {basic_plan.max_providers} providers")
            basic_plan.max_items = 100
            basic_plan.max_providers = 10
            print(f"  → Nuevo: 100 items, 10 providers")
        
        # Actualizar plan pro
        pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
        if pro_plan:
            print(f"Actualizando plan PRO: {pro_plan.max_items} items, {pro_plan.max_providers} providers")
            pro_plan.max_items = None  # Sin límite
            pro_plan.max_providers = None  # Sin límite
            print(f"  → Nuevo: Sin límites")
        
        db.commit()
        print("\n✓ Planes actualizados correctamente")
        
    except Exception as e:
        print(f"✗ Error actualizando planes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_plans()
