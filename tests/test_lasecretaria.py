"""La Secretaria migró a Laravel + Inertia: los productos vienen en JSON."""
from __future__ import annotations

import json

from app.providers.lasecretaria import LasecretariaClient


def _page(products: list) -> str:
    state = {"component": "content/products", "props": {"searchQuery": "cuaderno", "products": products}}
    return f'<html><body><script data-page="app" type="application/json">{json.dumps(state)}</script></body></html>'


def test_parses_inertia_page_state() -> None:
    html = _page([
        {
            "name": "CUADERNO 1/2 OFICIO 5MM 120 HJS RHEIN GREEN",
            "slug": "cuaderno-12-oficio",
            "legacyUrl": "/43-cuadernos-y-blocks/3646-cuaderno-12-oficio.html",
            "inStock": False,
            "prices": [{"amount": 3126, "originalAmount": 3126}],
            "media": [{"publicPath": "/media/catalog/3646.webp"}],
        },
        {"name": "Sin precio", "slug": "x", "prices": []},
    ])

    hits = LasecretariaClient()._parse_results(html, 5)

    assert hits == [{
        "title": "CUADERNO 1/2 OFICIO 5MM 120 HJS RHEIN GREEN",
        "url": "https://www.lasecretaria.cl/43-cuadernos-y-blocks/3646-cuaderno-12-oficio.html",
        "price": 3126,
        "image_url": "https://www.lasecretaria.cl/media/catalog/3646.webp",
        "available": False,
        "provider": "lasecretaria",
    }]


def test_page_without_state_returns_no_hits() -> None:
    assert LasecretariaClient()._parse_results("<html></html>", 5) == []
