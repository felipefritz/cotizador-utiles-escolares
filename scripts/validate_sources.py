#!/usr/bin/env python3
"""Smoke test en vivo de las fuentes publicadas por el cotizador."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import os
import time
from pathlib import Path
import sys

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

# Algunas instalaciones locales de certifi no incluyen el bundle. Render sí lo
# instala, pero este fallback permite ejecutar el smoke test en macOS/Linux.
if not os.getenv("REQUESTS_CA_BUNDLE") and Path("/etc/ssl/cert.pem").exists():
    os.environ["REQUESTS_CA_BUNDLE"] = "/etc/ssl/cert.pem"

from app.quoting.multi_provider import quote_multi_providers  # noqa: E402
from app.quoting.provider_registry import CORE_PROVIDERS  # noqa: E402


#: Consultas simultáneas. Bajo a propósito: el objetivo es comprobar que las
#: fuentes responden, no medir cuánto aguantan.
MAX_CONCURRENCY = 4

#: Espera antes del segundo intento, para dejar pasar un 429.
RETRY_PAUSE_SECONDS = 5.0

QUERIES = {
    # Librería, papelería y útiles escolares
    "dimeiggs": "cuaderno universitario",
    "libreria_nacional": "cuaderno",
    "pronobel": "lapiz grafito",
    "prisa": "resma carta",
    "lasecretaria": "carpeta oficio",
    "siemprelistos": "resma carta",
    "arteideas": "lapiz",
    "papelaria": "cuaderno",
    "libreriaacuario": "cuaderno",
    "bazarte": "lapiz",
    "libreriameiggs": "cuaderno",
    "comercialcr": "cuaderno",
    "tecnoutiles": "cuaderno",
    "felizgroup": "cuaderno",
    "torre": "cuaderno",
    "libreriaolimpica": "cuaderno",
    "antartica": "cuaderno",
    "fasit": "resma",
    "elcuaderno": "cuaderno",
    "mabeduna": "cuaderno",
    "librerianene": "cuaderno",
    # Arte y manualidades
    "dibu": "tempera",
    "jabeschile": "tempera",
    "somosarte": "tempera",
    "lacasadelarte": "tempera",
    "artemania": "tempera",
    "disenarte": "tempera",
    # Construcción y ferretería
    "construfer": "silicona",
    "ferreteriaprat": "taladro",
    "hangar77": "broca",
    "construplaza": "taladro",
    "patioferretero": "taladro",
    "herramientastotal": "taladro",
    "ferreteriastore": "taladro",
    "chileferret": "taladro",
    "herramientasferreteria": "martillo",
    # Casa y hogar
    "kitchencenter": "sarten",
    "homemobili": "silla escritorio",
    "fissman": "set de ollas",
    "kitchenhouse": "olla",
    "weitzler": "sarten",
    "santamariana": "olla",
    "bazared": "olla",
    "portomenaje": "olla",
    "tiendacopec": "olla",
    "homeonline": "olla",
    "rosen": "almohada",
    "fullmuebles": "silla",
    "prido": "silla",
    "euromob": "silla",
    "dimensiona": "escritorio",
    "productosdeaseo": "cloro",
    "llabres": "cloro",
    # Tecnología
    "alltec": "monitor",
    "maxitech": "monitor",
    "casaroyal": "audifonos",
    "chilepc": "monitor",
    "cintegral": "monitor",
    "notebookstore": "notebook",
    "compuelite": "monitor",
    "centralgamer": "monitor",
    "trulustore": "monitor",
    "xtremecomponents": "monitor",
    # Mascotas
    "bpets": "alimento gato",
    "pethome": "alimento perro",
    "maximascotas": "alimento perro",
    "patitasdemia": "master dog",
    "animaladas": "alimento perro",
    "bokapets": "alimento perro",
    "todoparasumascota": "alimento perro",
    "petco": "royal canin",
    # Supermercados
    "jumbo": "arroz",
    "lider": "arroz",
    "santaisabel": "arroz",
    "tottus": "arroz",
    # Mayoristas y distribuidores
    "apishop": "aceite",
    "alimentika": "arroz",
    "distribuidorasantiago": "arroz",
    "minimayorista": "arroz",
    "distribuidoraonline": "dulces",
    "fermarket": "arroz",
    "rgc": "cloro",
    "aseopormayor": "cloro",
    "outletdeaseo": "cloro",
}


def check(provider: str) -> tuple[str, bool, str, int]:
    result: dict = {}
    priced: list = []
    ok = False
    # Un segundo intento evita marcar como estructural un fallo transitorio.
    # La espera entre intentos es larga a propósito: varias plataformas
    # (Shopify entre ellas) responden 429 por IP, y correr este script seguido
    # basta para gatillarlo.
    for attempt in range(2):
        if attempt:
            time.sleep(RETRY_PAUSE_SECONDS)
        result = quote_multi_providers(
            QUERIES[provider],
            providers=[provider],
            limit_per_provider=3,
            max_results=3,
        )
        priced = [hit for hit in result.get("hits", []) if hit.get("price") is not None]
        ok = result.get("status") in {"ok", "partial"} and bool(priced)
        if ok:
            break
    return provider, ok, str(result.get("status")), len(priced)


def main() -> int:
    providers = list(CORE_PROVIDERS)

    missing = [provider for provider in providers if provider not in QUERIES]
    if missing:
        print(f"Sin consulta de control: {', '.join(missing)}")
        return 2

    with ThreadPoolExecutor(max_workers=MAX_CONCURRENCY) as executor:
        checks = list(executor.map(check, providers))

    failures = []
    for provider, ok, status, priced in checks:
        print(f"{'OK' if ok else 'FAIL':4} {provider:24} status={status} priced={priced}")
        if not ok:
            failures.append(provider)

    if failures:
        print(f"Fuentes con falla: {', '.join(failures)}")
        return 1
    print(f"Validación terminada: {len(providers)} fuentes operativas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
