"""Contrato de registro de fuentes.

Sumar un proveedor exige tocar varios archivos (ver CLAUDE.md). Estas pruebas
fallan cuando alguno queda desincronizado, que es el modo de falla habitual:
la fuente existe en el backend pero el frontend nunca la ofrece, o al revés.
"""
from __future__ import annotations

from pathlib import Path
import re

import pytest

from app.providers.structured_stores import STRUCTURED_PROVIDERS
from app.quoting.multi_provider import build_provider_funcs
from app.quoting.provider_registry import (
    AREA_DEFINITIONS,
    CORE_PROVIDERS,
    PROVIDER_AREAS,
    available_providers,
    demo_provider_limit,
    public_areas,
)


ROOT = Path(__file__).resolve().parents[1]
AREA_IDS = {str(area["id"]) for area in AREA_DEFINITIONS}


def test_core_providers_are_unique() -> None:
    assert len(CORE_PROVIDERS) == len(set(CORE_PROVIDERS))


@pytest.mark.parametrize("provider", CORE_PROVIDERS)
def test_every_core_provider_declares_valid_areas(provider: str) -> None:
    areas = PROVIDER_AREAS.get(provider)
    assert areas, f"{provider} no declara áreas en PROVIDER_AREAS"
    assert set(areas) <= AREA_IDS, f"{provider} declara áreas desconocidas: {areas}"


@pytest.mark.parametrize("provider", CORE_PROVIDERS)
def test_every_core_provider_is_queryable(provider: str) -> None:
    """Un id sin función queda registrado pero nunca devuelve resultados."""
    assert provider in build_provider_funcs("lapiz", 3)


@pytest.mark.parametrize("provider", CORE_PROVIDERS)
def test_every_core_provider_has_a_live_control_query(provider: str) -> None:
    queries = re.search(r"^QUERIES = \{(.*?)^\}", _read("scripts/validate_sources.py"), re.S | re.M)
    assert queries and f'"{provider}"' in queries.group(1), (
        f"{provider} no tiene consulta de control en scripts/validate_sources.py"
    )


@pytest.mark.parametrize("area", sorted(AREA_IDS))
def test_every_area_has_sources(area: str) -> None:
    assert available_providers(area), f"El área '{area}' quedó sin fuentes"


def test_public_areas_exposes_providers_per_area() -> None:
    areas = public_areas()
    assert {str(area["id"]) for area in areas} == AREA_IDS
    assert all(area["providers"] for area in areas)


def test_supermarket_demo_compares_every_retail_chain() -> None:
    assert demo_provider_limit("supermercado") == len(available_providers("supermercado")) == 5
    assert demo_provider_limit("educacion") == 2


def test_structured_providers_are_all_published() -> None:
    """Toda tienda estructurada implementada debe estar publicada, y viceversa."""
    unpublished = set(STRUCTURED_PROVIDERS) - set(CORE_PROVIDERS)
    assert not unpublished, f"Tiendas implementadas pero no publicadas: {sorted(unpublished)}"


@pytest.mark.parametrize("provider", CORE_PROVIDERS)
def test_frontend_declares_every_published_provider(provider: str) -> None:
    """`SourcesStep` solo pinta ids presentes en `SOURCES` de types.ts."""
    types = _read("frontend/src/types.ts")
    assert f"| '{provider}'" in types, f"{provider} falta en el union SourceId"
    assert f"id: '{provider}'" in types, f"{provider} falta en el array SOURCES"


def test_frontend_does_not_offer_unknown_providers() -> None:
    types = _read("frontend/src/types.ts")
    declared = set(re.findall(r"id: '([a-z0-9_]+)', name: '[^']*', available:", types))
    known = set(CORE_PROVIDERS) | {"mercadolibre"}
    assert declared <= known, f"El frontend ofrece fuentes que el backend no conoce: {sorted(declared - known)}"


def test_frontend_areas_match_backend_areas() -> None:
    types = _read("frontend/src/types.ts")
    declared = set(re.findall(r"\{ id: '([a-z]+)', name: '[^']+', description:", types))
    assert declared == AREA_IDS


def _read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")
