#!/usr/bin/env python
"""Script para verificar los límites actuales de los planes"""

import sys
sys.path.insert(0, '/Users/felipe/Documents/proyectos/cotizador-utiles')

from app.database import SessionLocal, Plan

def check_plans():
    db = SessionLocal()
    try:
        plans = db.query(Plan).all()
        
        print("\n📊 PLANES ACTUALES EN LA BASE DE DATOS:\n")
        print("-" * 70)
        
        for plan in plans:
            print(f"\n🔹 Plan: {plan.name.upper()}")
            print(f"   ID: {plan.id}")
            print(f"   Precio: ${plan.price:,.0f} CLP")
            print(f"   Max Items: {plan.max_items if plan.max_items is not None else '∞ (ilimitado)'}")
            print(f"   Max Proveedores: {plan.max_providers if plan.max_providers is not None else '∞ (ilimitado)'}")
            print(f"   Límite Mensual: {plan.monthly_limit if plan.monthly_limit is not None else '∞ (ilimitado)'}")
        
        print("\n" + "-" * 70)
        
    except Exception as e:
        print(f"✗ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_plans()
