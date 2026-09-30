"""Dimeiggs: el precio sale de la misma respuesta de sugerencias.

En la validación en vivo, la búsqueda de precio por `FT=<sku>` devolvía el
primer producto genérico del catálogo para cualquier SKU, así que todos los
resultados de Dimeiggs quedaban con el mismo precio equivocado.
"""
from __future__ import annotations

from typing import Any, Dict, List

import pytest

from app.providers import dimeiggs_catalog
from app.quoting import dimeiggs_quote


class _Resp:
    def __init__(self, payload: Any) -> None:
        self._payload = payload
        self.status_code = 200

    def json(self) -> Any:
        return self._payload

    def raise_for_status(self) -> None:
        return None


def _suggestions(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {"data": {"suggestionProducts": {"products": products}}}


def test_price_and_stock_come_from_the_suggestion_offer(monkeypatch: pytest.MonkeyPatch) -> None:
    products = [{
        "productName": "Cuaderno Universitario Liso 7 Mm 100 Hojas Colon",
        "linkText": "cuaderno-universitario-colon",
        "items": [{
            "itemId": "12368",
            "images": [{"imageUrl": "https://dimeiggs.example/c.jpg"}],
            "sellers": [{"commertialOffer": {"Price": 1290, "AvailableQuantity": 10000}}],
        }],
    }]
    monkeypatch.setattr(dimeiggs_catalog.requests.Session, "get", lambda self, *a, **k: _Resp(_suggestions(products)))

    def no_lookup(*args: Any, **kwargs: Any) -> Any:  # pragma: no cover - no debe llamarse
        raise AssertionError("no debe consultar el catálogo si la oferta trae precio")

    monkeypatch.setattr(dimeiggs_quote.requests, "get", no_lookup)

    result = dimeiggs_quote.quote_dimeiggs("cuaderno universitario", limit=5)

    hit = result["hits"][0]
    assert hit["price"] == 1290
    assert hit["available"] is True
    assert hit["sku"] == "12368"
    assert hit["url"] == "https://www.dimeiggs.cl/cuaderno-universitario-colon/p"


def test_fallback_lookup_filters_by_sku_not_full_text(monkeypatch: pytest.MonkeyPatch) -> None:
    products = [{
        "productName": "Tijera Escolar Punta Roma",
        "linkText": "tijera",
        "items": [{"itemId": "555", "sellers": [{"commertialOffer": {"Price": 0}}]}],
    }]
    monkeypatch.setattr(dimeiggs_catalog.requests.Session, "get", lambda self, *a, **k: _Resp(_suggestions(products)))
    captured: Dict[str, Any] = {}

    def lookup(url: str, **kwargs: Any) -> _Resp:
        captured.update(kwargs)
        return _Resp([
            {"items": [
                {"itemId": "999", "sellers": [{"commertialOffer": {"Price": 320}}]},
                {"itemId": "555", "sellers": [{"commertialOffer": {"Price": 1190}}]},
            ]}
        ])

    monkeypatch.setattr(dimeiggs_quote.requests, "get", lookup)

    result = dimeiggs_quote.quote_dimeiggs("tijera", limit=5)

    assert captured["params"] == {"fq": "skuId:555"}
    assert result["hits"][0]["price"] == 1190
