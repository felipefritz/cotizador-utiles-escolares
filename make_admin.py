#!/usr/bin/env python3
"""
Script para hacer a un usuario admin.

Carga `.env` explícitamente e imprime la base sobre la que va a escribir: sin
eso, `app/database.py` cae al SQLite local por defecto y el script informa
éxito habiendo tocado una base distinta a la esperada.

Para crear un admin desde cero (no solo promover uno existente), usar
`scripts/create_admin.py`.
"""
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from app.database import SessionLocal, User, engine  # noqa: E402


def make_admin(email: str) -> bool:
    print(f"Base de datos: {engine.url}")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Usuario {email} no encontrado")
            return False

        user.is_admin = True
        db.commit()
        db.refresh(user)
        # Se relee desde la base: un commit que no cuaja no debe reportar éxito.
        if not user.is_admin:
            print(f"No se pudo marcar como admin a {email}")
            return False
        print(f"Usuario {email} ahora es admin (id={user.id})")
        return True
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python3 make_admin.py <email>")
        sys.exit(1)

    sys.exit(0 if make_admin(sys.argv[1]) else 1)
