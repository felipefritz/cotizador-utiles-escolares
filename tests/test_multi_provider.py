"""Orquestador multi-fuente: respaldo de consultas, caché, plazo y orden."""
from __future__ import annotations

import time
from typing import Any, Dict, List

import pytest

from app.quoting import multi_provider


@pytest.fixture(autouse=True)
def _clean_cache():
    multi_provider.clear_cache()
    yield
    multi_provider.clear_cache()


def _fake_store(monkeypatch: pytest.MonkeyPatch, catalog: Dict[str, List[Dict[str, Any]]], calls: List[str]):
    """Reemplaza la búsqueda estructurada por un catálogo en memoria."""

    def fake_quote(provider: str, query: str, limit: int = 5) -> Dict[str, Any]:
        calls.append(f"{provider}:{query}")
        hits = [dict(hit, provider=provider) for hit in catalog.get(query, [])]
        return {"query": query, "status": "ok" if hits else "not_found", "hits": hits, "error": None}

    monkeypatch.setattr(multi_provider, "quote_structured_store", fake_quote)


def test_retries_with_simpler_query_when_store_finds_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    """WooCommerce devuelve 0 para "cuaderno universitario 100 hojas"."""
    calls: List[str] = []
    _fake_store(monkeypatch, {
        "cuaderno universitario": [
            {"title": "Cuaderno Universitario Stranger Things 7 mm 100 Hojas", "url": "u1", "price": 1690, "available": True},
        ],
    }, calls)

    result = multi_provider.quote_multi_providers("cuaderno universitario 100 hojas", providers=["torre"])

    assert calls == ["torre:cuaderno universitario 100 hojas", "torre:cuaderno universitario"]
    assert result["status"] == "ok"
    assert result["hits"][0]["price"] == 1690
    assert result["hits"][0]["relevance"] == 1.0
    assert result["hits"][0]["searched_as"] == "cuaderno universitario"


def test_fallback_results_must_cover_every_product_word(monkeypatch: pytest.MonkeyPatch) -> None:
    """Buscar "goma" para "goma eva" no autoriza a mostrar una goma de borrar."""
    calls: List[str] = []
    _fake_store(monkeypatch, {
        "goma": [{"title": "Goma de borrar miga Pelikan", "url": "g", "price": 350, "available": True}],
    }, calls)

    result = multi_provider.quote_multi_providers("goma eva", providers=["torre"])

    assert "torre:goma" in calls
    assert result["status"] == "no_results"


def test_shopify_stores_are_not_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    """Shopify limita por IP a ~24 tiendas juntas: no se suman reintentos."""
    calls: List[str] = []
    _fake_store(monkeypatch, {}, calls)

    multi_provider.quote_multi_providers("cuaderno universitario 100 hojas", providers=["pronobel"])

    assert calls == ["pronobel:cuaderno universitario 100 hojas"]


def test_does_not_retry_when_the_first_search_is_relevant(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: List[str] = []
    _fake_store(monkeypatch, {
        "estuche": [{"title": "Estuche doble cierre", "url": "e", "price": 2790, "available": True}],
    }, calls)

    multi_provider.quote_multi_providers("estuche", providers=["torre"])

    assert calls == ["torre:estuche"]


def test_repeated_queries_hit_the_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: List[str] = []
    _fake_store(monkeypatch, {
        "goma de borrar": [{"title": "Goma de borrar blanca", "url": "g", "price": 390, "available": True}],
    }, calls)

    for _ in range(3):
        multi_provider.quote_multi_providers("goma de borrar", providers=["torre"])

    assert calls == ["torre:goma de borrar"]


def test_errors_are_not_cached(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts: List[str] = []

    def failing(provider: str, query: str, limit: int = 5) -> Dict[str, Any]:
        attempts.append(query)
        return {"query": query, "status": "error", "hits": [], "error": "503"}

    monkeypatch.setattr(multi_provider, "quote_structured_store", failing)
    for _ in range(2):
        result = multi_provider.quote_multi_providers("resma carta", providers=["torre"])
    assert len(attempts) == 2
    assert result["status"] == "error"
    assert result["providers_failed"] == [("torre", "503")]


def test_slow_store_does_not_hold_the_response(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(multi_provider, "SEARCH_DEADLINE_SECONDS", 0.3)

    def fake_quote(provider: str, query: str, limit: int = 5) -> Dict[str, Any]:
        if provider == "chilepc":
            time.sleep(2)
        hits = [{"title": "Mouse inalámbrico Logitech", "url": provider, "price": 9990, "available": True, "provider": provider}]
        return {"query": query, "status": "ok", "hits": hits, "error": None}

    monkeypatch.setattr(multi_provider, "quote_structured_store", fake_quote)
    started = time.monotonic()
    result = multi_provider.quote_multi_providers("mouse inalambrico", providers=["cintegral", "chilepc"])

    assert time.monotonic() - started < 1.5
    assert result["status"] == "partial"
    assert [hit["provider"] for hit in result["hits"]] == ["cintegral"]
    assert result["providers_failed"][0][0] == "chilepc"


def test_available_products_are_listed_before_out_of_stock(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: List[str] = []
    _fake_store(monkeypatch, {
        "martillo": [
            {"title": "Martillo carpintero 16 oz", "url": "a", "price": 5593, "available": False},
            {"title": "Martillo albañil 600 gr", "url": "b", "price": 12465, "available": True},
        ],
    }, calls)

    result = multi_provider.quote_multi_providers("martillo", providers=["ferreteriastore"])

    assert [hit["url"] for hit in result["hits"]] == ["b", "a"]


def test_unknown_provider_is_reported_as_failed() -> None:
    result = multi_provider.quote_multi_providers("lapiz", providers=["no-existe"])
    assert result["status"] == "error"
    assert result["providers_failed"] == [("no-existe", "Proveedor desconocido")]
