#!/usr/bin/env python3
"""Crea (o promueve) un usuario administrador.

`make_admin.py` de la raíz solo promueve a alguien que ya existe. Este script
sirve para partir de cero: crea el usuario si hace falta, lo marca admin y le
deja una suscripción activa al plan indicado, para poder revisar la cuenta con
límites reales.

    python scripts/create_admin.py --email admin@preciofast.cl --password '...'
    python scripts/create_admin.py --email admin@preciofast.cl --password '...' --plan pro

Escribe en la base que indique `DATABASE_URL`, y la imprime antes de tocar
nada: `.env` de este repo apunta a producción, así que para trabajar en local
hay que sobrescribirla.

    DATABASE_URL="sqlite:///./local.db" python scripts/create_admin.py ...
"""
from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
import sys

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from app.auth import hash_password  # noqa: E402
from app.database import (  # noqa: E402
    Plan,
    SessionLocal,
    Subscription,
    SubscriptionStatus,
    User,
    engine,
    init_db,
)


def create_admin(email: str, password: str, username: str, plan_name: str | None) -> int:
    print(f"Base de datos: {engine.url}")
    init_db()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                email=email,
                username=username,
                name=username,
                provider="local",
                is_active=True,
            )
            db.add(user)
            created = True
        else:
            created = False

        user.password_hash = hash_password(password)
        user.is_admin = True
        user.is_active = True
        db.commit()
        db.refresh(user)

        if plan_name:
            plan = db.query(Plan).filter(Plan.name == plan_name).first()
            if plan is None:
                disponibles = [p.name for p in db.query(Plan).all()]
                print(f"No existe el plan '{plan_name}'. Disponibles: {disponibles or 'ninguno'}")
                return 1
            subscription = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            if subscription is None:
                subscription = Subscription(user_id=user.id)
                db.add(subscription)
            subscription.plan_id = plan.id
            subscription.status = SubscriptionStatus.active
            subscription.started_at = datetime.utcnow()
            db.commit()
            print(f"Suscripción: plan '{plan.name}' activa")

        print(f"{'Creado' if created else 'Actualizado'}: {user.email} (id={user.id}, admin={user.is_admin})")
        # El login busca por username primero y por email como alternativa;
        # se muestra el username porque es el identificador principal.
        print(f"Login con usuario: '{user.username}'  (o su email: '{user.email}')")
        return 0
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Crea o promueve un usuario administrador.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--username", default=None, help="Por defecto, la parte antes del @")
    parser.add_argument("--plan", default=None, help="Nombre del plan a activar (ej. pro)")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("La contraseña debe tener al menos 8 caracteres.")
        return 1

    username = args.username or args.email.split("@")[0]
    return create_admin(args.email, args.password, username, args.plan)


if __name__ == "__main__":
    raise SystemExit(main())
