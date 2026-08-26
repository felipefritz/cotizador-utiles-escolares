from __future__ import annotations

from typing import Any

import pytest
import requests

from app.providers import structured_stores


class FakeResponse:
    def __init__(
        self,
        *,
        payload: Any = None,
        text: str = "",
        status_code: int = 200,
        headers: dict[str, str] | None = None,
    ) -> None:
        self._payload = payload if payload is not None else {}
        self.text = text
        self.status_code = status_code
        self.headers = headers or {}

    def json(self) -> Any:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} Client Error")


def fake_get(monkeypatch: pytest.MonkeyPatch, *, payload: Any = None, text: str = "") -> dict[str, Any]:
    """Reemplaza `requests.get` y deja visibles los parámetros de la llamada."""
    captured: dict[str, Any] = {}

    def _get(url: str, **kwargs: Any) -> FakeResponse:
        captured["url"] = url
        captured.update(kwargs)
        return FakeResponse(payload=payload, text=text)

    monkeypatch.setattr(structured_stores.requests, "get", _get)
    return captured


def test_shopify_search_normalizes_products(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "resources": {
            "results": {
                "products": [
                    {
                        "title": "Resma carta 500 hojas",
                        "url": "/products/resma-carta",
                        "price": "4990.00",
                        "available": True,
                        "image": "https://cdn.example/resma.jpg",
                    }
                ]
            }
        }
    }
    fake_get(monkeypatch, payload=payload)

    hits = structured_stores.search_shopify("siemprelistos", "resma", 5)

    assert hits == [
        {
            "title": "Resma carta 500 hojas",
            "url": "https://www.siemprelistos.cl/products/resma-carta",
            "price": 4990,
            "available": True,
            "provider": "siemprelistos",
            "image_url": "https://cdn.example/resma.jpg",
        }
    ]


def test_woocommerce_unescapes_title_and_keeps_clp_units(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = [
        {
            "name": "Monitor Viewsonic 27&#8243; IPS",
            "permalink": "https://chilepc.cl/producto/monitor-viewsonic-27/",
            "prices": {"price": "149500", "currency_minor_unit": 0},
            "is_in_stock": True,
            "images": [{"src": "https://chilepc.cl/monitor.png"}],
        }
    ]
    fake_get(monkeypatch, payload=payload)

    hits = structured_stores.search_woocommerce("chilepc", "monitor", 5)

    assert hits[0]["title"] == 'Monitor Viewsonic 27″ IPS'
    assert hits[0]["price"] == 149500


def test_woocommerce_respects_declared_minor_unit(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = [
        {
            "name": "Broca",
            "permalink": "https://hangar77.cl/broca",
            "prices": {"price": "527000", "currency_minor_unit": 2},
            "images": [],
        }
    ]
    fake_get(monkeypatch, payload=payload)

    hits = structured_stores.search_woocommerce("hangar77", "broca", 5)

    assert hits[0]["price"] == 5270


def test_woocommerce_skips_products_without_price(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = [
        {"name": "Sin precio", "permalink": "https://somosarte.cl/x", "prices": {"price": "0"}},
        {"name": "Témpera", "permalink": "https://somosarte.cl/t", "prices": {"price": "1990"}},
    ]
    fake_get(monkeypatch, payload=payload)

    hits = structured_stores.search_woocommerce("somosarte", "tempera", 5)

    assert [hit["title"] for hit in hits] == ["Témpera"]


def test_jumpseller_reads_numeric_data_price(monkeypatch: pytest.MonkeyPatch) -> None:
    html = """
    <article class="product-block">
      <a class="product-block__name" href="/cuaderno">Cuaderno Matemática 25X21Cm</a>
      <span class="product-block__price">$1.320</span>
      <input class="product-block__input" data-price="1320.0" max="8">
      <img class="product-block__image" data-src="https://cdnx.example/c.jpg"
           src="https://assets.example/placeholder.png">
    </article>
    """
    fake_get(monkeypatch, text=html)

    hits = structured_stores.search_jumpseller("felizgroup", "cuaderno", 5)

    assert hits[0]["price"] == 1320
    assert hits[0]["available"] is True
    assert hits[0]["url"] == "https://www.felizgroupxmayor.cl/cuaderno"
    # El lazy load deja un placeholder en `src`; la foto real está en `data-src`.
    assert hits[0]["image_url"] == "https://cdnx.example/c.jpg"


def test_jumpseller_takes_selling_price_from_stacked_amounts(monkeypatch: pytest.MonkeyPatch) -> None:
    html = """
    <div class="product-block">
      <a class="product-block__name" href="/monitor-asus">Monitor Asus 24</a>
      <div class="product-block__price">$119.016 $144.000 6 cuotas sin interés de $20.880</div>
    </div>
    """
    fake_get(monkeypatch, text=html)

    hits = structured_stores.search_jumpseller("compuelite", "monitor", 5)

    assert hits[0]["price"] == 119016


def test_jumpseller_marks_out_of_stock(monkeypatch: pytest.MonkeyPatch) -> None:
    html = """
    <div class="product-block">
      <a class="product-block__name" href="/olla">Olla Multiuso</a>
      <form data-price="$27.990"></form>
      <input data-stock="0">
    </div>
    """
    fake_get(monkeypatch, text=html)

    hits = structured_stores.search_jumpseller("santamariana", "olla", 5)

    assert hits[0]["price"] == 27990
    assert hits[0]["available"] is False


def test_magento_prefers_final_price_over_range_text(monkeypatch: pytest.MonkeyPatch) -> None:
    html = """
    <li class="product-item">
      <a class="product-item-link" href="https://www.rosen.cl/set-2-almohadas.html">Set 2 Almohadas</a>
      <span class="price-wrapper" data-price-amount="44990" data-price-type="finalPrice">
        <span class="price">$44.990 - $59.990</span>
      </span>
      <img class="product-image-photo" src="https://www.rosen.cl/media/almohada.jpg">
    </li>
    """
    fake_get(monkeypatch, text=html)

    hits = structured_stores.search_magento("rosen", "almohada", 5)

    assert hits[0]["price"] == 44990
    assert hits[0]["url"] == "https://www.rosen.cl/set-2-almohadas.html"


def test_magento_falls_back_to_price_text(monkeypatch: pytest.MonkeyPatch) -> None:
    html = """
    <li class="product-item">
      <a class="product-item-link" href="/papel.html">Papel Fotocopia A4</a>
      <span class="price">$3.964</span>
    </li>
    """
    fake_get(monkeypatch, text=html)

    hits = structured_stores.search_magento("fasit", "resma", 5)

    assert hits[0]["price"] == 3964


def test_prestashop_new_theme_parses_wholesale_label(monkeypatch: pytest.MonkeyPatch) -> None:
    html = """
    <article class="js-product-miniature">
      <h2 class="product-title"><a href="/cuaderno.html">CUADERNO UNIV. 7MM 100HJS</a></h2>
      <div class="product-price-and-shipping"><span class="price">Por mayor $ 1420</span></div>
      <img src="data:image/gif;base64,R0lGOD" data-full-size-image-url="https://libreriaolimpica.cl/c.jpg">
    </article>
    """
    fake_get(monkeypatch, text=html)

    hits = structured_stores.search_prestashop("libreriaolimpica", "cuaderno", 5)

    assert hits[0]["price"] == 1420
    assert hits[0]["image_url"] == "https://libreriaolimpica.cl/c.jpg"


def test_prestashop_old_theme_detects_out_of_stock(monkeypatch: pytest.MonkeyPatch) -> None:
    html = """
    <ul class="product_list">
      <li class="ajax_block_product">
        <a class="product-name" href="/monitor-24">Monitor IPS 24 pulgadas</a>
        <div class="right-block"><span class="price product-price">$ 98.000</span></div>
        <span>Fuera de stock</span>
        <img data-src="/img/monitor.jpg">
      </li>
    </ul>
    """
    fake_get(monkeypatch, text=html)

    hits = structured_stores.search_prestashop("alltec", "monitor", 5)

    assert hits[0]["price"] == 98000
    assert hits[0]["available"] is False
    assert hits[0]["image_url"] == "https://www.alltec.cl/img/monitor.jpg"


def test_search_structured_store_rejects_unknown_provider() -> None:
    with pytest.raises(ValueError):
        structured_stores.search_structured_store("no-existe", "lapiz", 5)


def test_search_structured_store_short_circuits_empty_query() -> None:
    assert structured_stores.search_structured_store("siemprelistos", "   ", 5) == []


@pytest.mark.parametrize("provider", structured_stores.STRUCTURED_PROVIDERS)
def test_every_structured_provider_has_a_base_url(provider: str) -> None:
    assert structured_stores.store_base_url(provider), provider


def test_get_retries_once_when_the_store_throttles(monkeypatch: pytest.MonkeyPatch) -> None:
    """Un 429 pasajero no debe sacar a una tienda sana de la cotización."""
    responses = [
        FakeResponse(status_code=429, headers={"Retry-After": "0"}),
        FakeResponse(payload=[{
            "name": "Arroz 1kg",
            "permalink": "https://alimentika.cl/arroz",
            "prices": {"price": "1490"},
            "images": [],
        }]),
    ]
    calls: list[str] = []

    def _get(url: str, **kwargs: Any) -> FakeResponse:
        calls.append(url)
        return responses.pop(0)

    monkeypatch.setattr(structured_stores.requests, "get", _get)
    monkeypatch.setattr(structured_stores.time, "sleep", lambda _seconds: None)

    hits = structured_stores.search_woocommerce("alimentika", "arroz", 5)

    assert len(calls) == 2
    assert hits[0]["price"] == 1490


def test_get_gives_up_after_the_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        structured_stores.requests,
        "get",
        lambda *args, **kwargs: FakeResponse(status_code=429),
    )
    monkeypatch.setattr(structured_stores.time, "sleep", lambda _seconds: None)

    with pytest.raises(requests.HTTPError):
        structured_stores.search_woocommerce("alimentika", "arroz", 5)


def test_retry_delay_honours_retry_after_within_the_cap() -> None:
    assert structured_stores._retry_delay(FakeResponse(headers={"Retry-After": "1"}), 0) == 1.0
    # Una espera larguísima se recorta: el presupuesto por proveedor es acotado.
    assert structured_stores._retry_delay(FakeResponse(headers={"Retry-After": "120"}), 0) == (
        structured_stores.MAX_RETRY_DELAY
    )
    # Un `Retry-After` con formato de fecha no rompe: cae al backoff por defecto.
    assert structured_stores._retry_delay(FakeResponse(headers={"Retry-After": "Wed, 21 Oct"}), 0) > 0
