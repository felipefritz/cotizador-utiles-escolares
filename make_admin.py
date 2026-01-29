#!/usr/bin/env python3
"""
Script para hacer a un usuario admin
"""
import sys
from app.database import SessionLocal, User

def make_admin(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Usuario {email} no encontrado")
            return False
        
        user.is_admin = True
        db.commit()
        print(f"Usuario {email} ahora es admin ✅")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python3 make_admin.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    make_admin(email)
