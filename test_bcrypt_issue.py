#!/usr/bin/env python3
"""Test para diagnosticar el problema de bcrypt con contraseñas"""

import sys
sys.path.insert(0, '/Users/felipe/Documents/proyectos/cotizador-utiles')

from passlib.context import CryptContext

print("=" * 60)
print("TEST 1: CryptContext SIN truncate_error")
print("=" * 60)

try:
    pwd_context_sin = CryptContext(schemes=["bcrypt"], deprecated="auto")
    test_password = "admin12345"
    print(f"Contraseña: {test_password}")
    print(f"Longitud: {len(test_password)} caracteres")
    hashed = pwd_context_sin.hash(test_password)
    print(f"✓ ÉXITO: Contraseña hasheada correctamente")
    print(f"Hash: {hashed[:50]}...")
except Exception as e:
    print(f"✗ ERROR: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
print("TEST 2: CryptContext CON truncate_error=False")
print("=" * 60)

try:
    pwd_context_con = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        truncate_error=False
    )
    test_password = "admin12345"
    print(f"Contraseña: {test_password}")
    print(f"Longitud: {len(test_password)} caracteres")
    hashed = pwd_context_con.hash(test_password)
    print(f"✓ ÉXITO: Contraseña hasheada correctamente")
    print(f"Hash: {hashed[:50]}...")
except Exception as e:
    print(f"✗ ERROR: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
print("TEST 3: Contraseña MÁS LARGA (100 caracteres)")
print("=" * 60)

try:
    pwd_context_con = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        truncate_error=False
    )
    long_password = "a" * 100  # 100 caracteres
    print(f"Longitud: {len(long_password)} caracteres")
    hashed = pwd_context_con.hash(long_password)
    print(f"✓ ÉXITO: Contraseña larga hasheada correctamente")
    print(f"Hash: {hashed[:50]}...")
except Exception as e:
    print(f"✗ ERROR: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
print("TEST 4: Usando truncate manual [:72]")
print("=" * 60)

try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    test_password = "admin12345"[:72]
    print(f"Contraseña: {test_password}")
    print(f"Longitud: {len(test_password)} caracteres")
    hashed = pwd_context.hash(test_password)
    print(f"✓ ÉXITO: Contraseña truncada hasheada correctamente")
    print(f"Hash: {hashed[:50]}...")
except Exception as e:
    print(f"✗ ERROR: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
print("TEST 5: Verificar versión de passlib")
print("=" * 60)

try:
    import passlib
    print(f"Versión de passlib: {passlib.__version__}")
except Exception as e:
    print(f"Error al obtener versión: {e}")
