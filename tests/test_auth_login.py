"""Identificador de login: username o email."""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth import get_user_by_login, hash_password, verify_password
from app.database import Base, User


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    session.add_all([
        User(username="adminpf", email="admin@preciofast.cl", password_hash=hash_password("secreta123")),
        User(username="felipe", email="Felipe@Ejemplo.CL", password_hash=hash_password("otra123456")),
    ])
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_finds_user_by_username(db) -> None:
    assert get_user_by_login(db, "adminpf").email == "admin@preciofast.cl"


def test_finds_user_by_email(db) -> None:
    """El registro pide usuario y email; entrar con el email debe funcionar."""
    assert get_user_by_login(db, "admin@preciofast.cl").username == "adminpf"


def test_email_lookup_ignores_casing(db) -> None:
    assert get_user_by_login(db, "felipe@ejemplo.cl").username == "felipe"
    assert get_user_by_login(db, "FELIPE@EJEMPLO.CL").username == "felipe"


def test_identifier_is_trimmed(db) -> None:
    assert get_user_by_login(db, "  adminpf  ").username == "adminpf"


def test_username_wins_over_email(db) -> None:
    """Si un username coincide con el email de otro, manda el username."""
    db.add(User(username="admin@preciofast.cl", email="otro@ejemplo.cl",
                password_hash=hash_password("tercera123")))
    db.commit()

    assert get_user_by_login(db, "admin@preciofast.cl").email == "otro@ejemplo.cl"


def test_unknown_identifier_returns_none(db) -> None:
    assert get_user_by_login(db, "no-existe") is None
    assert get_user_by_login(db, "") is None
    assert get_user_by_login(db, "   ") is None


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("secreta123")
    assert hashed != "secreta123"
    assert verify_password("secreta123", hashed)
    assert not verify_password("otra", hashed)
