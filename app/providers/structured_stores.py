"""Clientes para tiendas con búsquedas públicas y estructuras verificadas.

Las integraciones de este módulo usan los mismos endpoints que las vitrinas
públicas de cada tienda. No requieren credenciales ni eluden protecciones
anti-bot.

Cada plataforma tiene un único parser genérico y las tiendas se declaran como
`id -> url base` en los diccionarios de más abajo. Para sumar una tienda que
corre sobre una plataforma ya soportada basta agregar una línea al diccionario
que corresponda.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation
import html
import json
import re
import time
from typing import Any, Dict, List, Tuple
import unicodedata
from urllib.parse import quote, urljoin

import requests
from bs4 import BeautifulSoup

from app.quoting.http_utils import request_kwargs


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
JSON_HEADERS = {"Accept": "application/json", "User-Agent": USER_AGENT}
HTML_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
}


SHOPIFY_STORES = {
    "siemprelistos": "https://www.siemprelistos.cl",
    "kitchencenter": "https://www.kitchencenter.cl",
    "homemobili": "https://homemobili.cl",
    "arteideas": "https://libreriaarteideas.cl",
    "papelaria": "https://www.papelaria.cl",
    "libreriaacuario": "https://libreriacuario.cl",
    "bazarte": "https://libreriabazarte.cl",
    "fissman": "https://fissman.cl",
    "kitchenhouse": "https://kitchenhouse.cl",
    "maxitech": "https://tiendamaxitech.cl",
    "apishop": "https://apishop.cl",
    "libreriameiggs": "https://www.libreriameiggs.cl",
    "dibu": "https://www.dibu.cl",
    "patioferretero": "https://www.patioferretero.cl",
    "herramientastotal": "https://herramientastotal.cl",
    "bazared": "https://www.bazared.cl",
    "portomenaje": "https://www.portomenaje.cl",
    "tiendacopec": "https://www.tiendacopec.cl",
    "homeonline": "https://homeonline.cl",
    "fullmuebles": "https://fullmuebles.cl",
    # Mascotas. Predictive Search validado con alimento y accesorios reales.
    "bpets": "https://www.bpets.cl",
    "pethome": "https://pethome.cl",
    "maximascotas": "https://maximascotas.cl",
    # Pronobel migró a Shopify: el scraper HTML propio dejó de encontrar
    # productos y el Predictive Search sí responde con precio y stock.
    "pronobel": "https://pronobel.cl",
    # Ferretería Prat migró de Magento a Shopify: `/catalogsearch/result/`
    # respondía 404 desde producción (septiembre de 2026).
    "ferreteriaprat": "https://ferreteriaprat.cl",
}

WOOCOMMERCE_STORES = {
    "weitzler": "https://www.weitzler.cl",
    "hangar77": "https://hangar77.cl",
    "tecnoutiles": "https://tecnoutiles.cl",
    "comercialcr": "https://comcr.cl",
    "torre": "https://www.torre.cl",
    "jabeschile": "https://jabeschile.cl",
    "somosarte": "https://somosarte.cl",
    "ferreteriastore": "https://ferreteriastore.cl",
    "chileferret": "https://chileferret.cl",
    "herramientasferreteria": "https://herramientasferreteria.cl",
    "chilepc": "https://chilepc.cl",
    "cintegral": "https://cintegral.cl",
    "alimentika": "https://alimentika.cl",
    "distribuidorasantiago": "https://distribuidorasantiago.cl",
    "minimayorista": "https://minimayorista.cl",
    "distribuidoraonline": "https://distribuidoraonline.cl",
    "productosdeaseo": "https://www.productosdeaseo.cl",
    "llabres": "https://llabres.cl",
    "rgc": "https://rgc.cl",
    "aseopormayor": "https://aseopormayor.cl",
    "prido": "https://www.prido.cl",
    "euromob": "https://www.euromob.cl",
    "dimensiona": "https://muebles.dimensiona.cl",
    # Tecnología
    "centralgamer": "https://centralgamer.cl",
    "trulustore": "https://trulustore.cl",
    "xtremecomponents": "https://xtremecomponents.cl",
    # Mascotas
    "patitasdemia": "https://www.patitasdemiapetshop.cl",
    "animaladas": "https://animaladas.cl",
    "bokapets": "https://www.bokapets.cl",
}

JUMPSELLER_STORES = {
    "construfer": "https://www.construfer.cl",
    "santamariana": "https://santamariana.cl",
    "felizgroup": "https://www.felizgroupxmayor.cl",
    "notebookstore": "https://notebookstore.cl",
    "compuelite": "https://www.compuelite.cl",
    "lacasadelarte": "https://www.lacasadelarte.cl",
    "fermarket": "https://www.fermarket.cl",
    "elcuaderno": "https://www.elcuaderno.cl",
    "mabeduna": "https://www.libreriamabeduna.cl",
    "librerianene": "https://web.librerianene.cl",
    "outletdeaseo": "https://www.outletdeaseo.cl",
    "todoparasumascota": "https://www.todoparasumascota.cl",
}

MAGENTO_STORES = {
    "antartica": "https://www.antartica.cl",
    "fasit": "https://fasit.cl",
    "rosen": "https://www.rosen.cl",
}

PRESTASHOP_STORES = {
    "alltec": "https://www.alltec.cl",
    "artemania": "https://www.artemaniachile.cl",
    # `www.` redirige al dominio desnudo; se usa directo para ahorrar un salto.
    "libreriaolimpica": "https://libreriaolimpica.cl",
}

#: Ruta del buscador cuando la tienda la tradujo. En ArteMania `/search`
#: redirige a `/busqueda` perdiendo la consulta y muestra productos
#: destacados, que el parser tomaba como resultados.
PRESTASHOP_SEARCH_PATHS = {
    "artemania": "/busqueda",
    "libreriaolimpica": "/busqueda",
}

#: Tiendas VTEX consultadas por su API pública de catálogo, la misma que usa
#: la vitrina. Construplaza migró desde Magento (el buscador viejo da 404) y
#: en Casa Royal el HTML no traía resultados para consultas de varias palabras.
VTEX_STORES = {
    "casaroyal": "https://www.casaroyal.cl",
    "construplaza": "https://www.construplaza.cl",
}

TIENDANUBE_STORES = {
    "disenarte": "https://www.tiendadisenarte.cl",
}


def _int_price(value: Any) -> int | None:
    """Convierte un precio ya numérico (`"4990"`, `"4990.00"`) a entero CLP."""
    if value is None or value == "":
        return None
    try:
        return int(Decimal(str(value)))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _clp_from_text(value: str | None) -> int | None:
    """Extrae el primer precio en pesos de un texto.

    Las vitrinas suelen apilar varios montos en el mismo bloque
    (`"$119.016 $144.000 6 cuotas de $20.880"`); el primero es el precio de
    venta, así que se toma ese y se ignora el resto.
    """
    if not value:
        return None
    # Espacios duros entre grupos de miles ("12 990" de `Intl.NumberFormat`)
    # se tratan como separador de miles.
    text = re.sub(r"(?<=\d)[\u00a0\u202f](?=\d{3}(?!\d))", ".", value)
    text = text.replace("\xa0", " ").replace("\u202f", " ").strip()
    # Un monto agrupado con espacios comunes ("$ 12 990") solo se acepta si es
    # todo el texto: "$990 120 hojas" no debe leerse como 990.120.
    spaced = re.fullmatch(r"\$?\s*(\d{1,3}(?: \d{3})+)", text)
    if spaced:
        return int(spaced.group(1).replace(" ", ""))
    # Miles con punto o coma; los decimales (",00") y lo que venga después
    # ("10% OFF", "12 cuotas") no se pegan al monto.
    amount = r"(\d{1,3}(?:[.,]\d{3})+|\d+)"
    match = re.search(r"\$\s*" + amount, text) or re.search(amount, text)
    digits = re.sub(r"[^0-9]", "", match.group(1)) if match else ""
    return int(digits) if digits else None


def _attr_price(value: str | None) -> int | None:
    """Precio tomado de un atributo HTML, que puede venir numérico o con formato."""
    if not value:
        return None
    raw = value.strip()
    if re.fullmatch(r"\d+(\.\d{1,2})?", raw):
        return int(float(raw))
    return _clp_from_text(raw)


def _image_url(element: Any, base_url: str) -> str | None:
    """Resuelve la imagen de una tarjeta tolerando los atributos de lazy load.

    Los atributos de lazy load van primero: cuando existen, `src` trae un
    placeholder del tema y no la foto del producto.
    """
    if element is None:
        return None
    for attribute in ("data-src", "data-original", "data-lazy", "data-full-size-image-url", "src"):
        value = element.get(attribute)
        if value and not value.startswith("data:"):
            return urljoin(base_url, value)
    srcset = element.get("srcset") or element.get("data-srcset")
    if srcset:
        first = srcset.split(",")[0].strip().split(" ")[0]
        if first and not first.startswith("data:"):
            return urljoin(base_url, first)
    return None


def _is_truncated(title: str) -> bool:
    return title.rstrip().endswith(("..", "…"))


def _full_title(title: str, *alternatives: str | None) -> str:
    """Reemplaza un título recortado por la vitrina ("Cuaderno Universitario
    Frozen 100..") por su versión completa, si la tarjeta la trae en un
    atributo `title`/`alt`. Sin el título completo se pierden justo las cifras
    que distinguen un producto de otro."""
    if not _is_truncated(title):
        return title
    prefix = title.rstrip(" .…").lower()
    for candidate in alternatives:
        candidate = (candidate or "").strip()
        if len(candidate) > len(prefix) and candidate.lower().startswith(prefix[: max(5, len(prefix) - 3)]):
            return candidate
    return title


def _normalize_query(value: str) -> str:
    return "".join(
        char for char in unicodedata.normalize("NFD", value.lower())
        if unicodedata.category(char) != "Mn"
    )


#: Códigos en que la tienda pide esperar, no que la consulta esté mal.
THROTTLED_STATUS = {429, 503}
#: Tope de espera antes de reintentar. El presupuesto por proveedor es 15 s.
MAX_RETRY_DELAY = 3.0


def _retry_delay(response: Any, attempt: int) -> float:
    """Segundos a esperar, respetando `Retry-After` cuando la tienda lo manda."""
    retry_after = response.headers.get("Retry-After") if hasattr(response, "headers") else None
    if retry_after:
        try:
            return min(float(retry_after), MAX_RETRY_DELAY)
        except (TypeError, ValueError):
            pass
    return min(0.8 * (attempt + 1), MAX_RETRY_DELAY)


def _get(
    url: str,
    *,
    params: Dict[str, Any],
    headers: Dict[str, str],
    timeout: int = 20,
    retries: int = 1,
    retry_statuses: set[int] = THROTTLED_STATUS,
):
    """GET con un reintento ante throttling.

    Cotizar una lista escolar dispara muchas consultas seguidas a la misma
    tienda; varias responden 429 y se recuperan enseguida. Sin este reintento
    una fuente sana se caería de la cotización por un límite pasajero.
    """
    for attempt in range(retries + 1):
        response = requests.get(url, params=params, headers=headers, timeout=timeout, **request_kwargs())
        if response.status_code in retry_statuses and attempt < retries:
            time.sleep(_retry_delay(response, attempt))
            continue
        response.raise_for_status()
        return response
    return response


def search_shopify(provider: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Predictive Search de Shopify (`/search/suggest.json`)."""
    base_url = SHOPIFY_STORES[provider]
    response = _get(
        f"{base_url}/search/suggest.json",
        params={
            "q": query,
            "resources[type]": "product",
            "resources[limit]": max(1, min(limit, 10)),
            "resources[options][unavailable_products]": "last",
        },
        headers=JSON_HEADERS,
        timeout=15,
    )
    products = (((response.json() or {}).get("resources") or {}).get("results") or {}).get("products") or []

    hits: List[Dict[str, Any]] = []
    for product in products:
        title = str(product.get("title") or "").strip()
        relative_url = product.get("url")
        price = _int_price(product.get("price") or product.get("price_min"))
        if not title or not relative_url or price is None:
            continue
        hits.append({
            "title": title,
            "url": urljoin(base_url, relative_url),
            "price": price,
            "available": bool(product.get("available", True)),
            "provider": provider,
            "image_url": product.get("image"),
        })
        if len(hits) >= limit:
            break
    return hits


def search_woocommerce(provider: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Store API pública de WooCommerce (`/wp-json/wc/store/v1/products`)."""
    base_url = WOOCOMMERCE_STORES[provider]
    response = _get(
        f"{base_url}/wp-json/wc/store/v1/products",
        params={"search": query, "per_page": max(1, min(limit, 10))},
        headers=JSON_HEADERS,
        timeout=20,
    )

    hits: List[Dict[str, Any]] = []
    for product in response.json() or []:
        title = html.unescape(str(product.get("name") or "")).strip()
        url = product.get("permalink")
        prices = product.get("prices") or {}
        price = _int_price(prices.get("price"))
        # La Store API expresa el precio en la unidad mínima de la moneda. Las
        # tiendas chilenas usan 0 decimales, pero se respeta lo que declaren.
        minor_unit = prices.get("currency_minor_unit")
        if price is not None and isinstance(minor_unit, int) and minor_unit > 0:
            price = int(price / (10 ** minor_unit))
        images = product.get("images") or []
        if not title or not url or not price:
            continue
        hits.append({
            "title": title,
            "url": url,
            "price": price,
            "available": bool(product.get("is_in_stock", True)),
            "provider": provider,
            "image_url": images[0].get("src") if images else None,
        })
        if len(hits) >= limit:
            break
    return hits


def search_jumpseller(provider: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """HTML de resultados de Jumpseller (`/search?q=`)."""
    base_url = JUMPSELLER_STORES[provider]
    response = _get(f"{base_url}/search", params={"q": query}, headers=HTML_HEADERS, timeout=20)
    soup = BeautifulSoup(response.text, "html.parser")

    hits: List[Dict[str, Any]] = []
    for card in soup.select(".product-block"):
        # Los temas de Jumpseller varían: unos nombran el enlace del producto,
        # otros dejan el título en un encabezado y el enlace sin texto.
        name_link = card.select_one("a.product-block__name[href]")
        link = name_link or card.select_one("a[href]")
        if not link:
            continue
        heading = card.select_one("h2, h3, h4, .product-block__title")
        image = card.select_one("img.product-block__image") or card.select_one("img")
        if name_link:
            title = name_link.get_text(" ", strip=True)
        elif heading:
            title = heading.get_text(" ", strip=True)
        else:
            title = (link.get("title") or (image.get("alt") if image else "") or "").strip()
        title = _full_title(
            title,
            link.get("title"),
            name_link.get("title") if name_link else None,
            image.get("alt") if image else None,
            heading.get_text(" ", strip=True) if heading else None,
        )
        price_element = (
            card.select_one(".product-block__price--new")
            or card.select_one(".product-block__price")
            or card.select_one("[class*=price]")
        )
        price_holder = card.select_one("[data-price]")
        price = _attr_price(price_holder.get("data-price") if price_holder else None)
        if price is None and price_element:
            price = _clp_from_text(price_element.get_text(" ", strip=True))
        if not title or not price:
            continue
        quantity_input = card.select_one("input.product-block__input")
        stock_input = card.select_one("input[data-stock]")
        available = True
        if quantity_input is not None and quantity_input.get("max") == "0":
            available = False
        if stock_input is not None and stock_input.get("data-stock") == "0":
            available = False
        hits.append({
            "title": title,
            "url": urljoin(base_url, link.get("href")),
            "price": price,
            "available": available,
            "provider": provider,
            "image_url": _image_url(image, base_url),
        })
        if len(hits) >= limit:
            break
    return hits


def search_magento(provider: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """HTML de resultados de Magento (`/catalogsearch/result/?q=`)."""
    base_url = MAGENTO_STORES[provider]
    response = _get(
        f"{base_url}/catalogsearch/result/",
        params={"q": query},
        headers=HTML_HEADERS,
        timeout=25,
    )
    soup = BeautifulSoup(response.text, "html.parser")

    hits: List[Dict[str, Any]] = []
    for card in soup.select("li.product-item, .product-item"):
        link = card.select_one("a.product-item-link[href]")
        if not link:
            continue
        title = link.get_text(" ", strip=True)
        # El precio final es el que Magento marca como `finalPrice`; el resto
        # de los montos de la tarjeta son precio normal o rangos.
        price_element = (
            card.select_one('[data-price-type="finalPrice"][data-price-amount]')
            or card.select_one("[data-price-amount]")
        )
        price = _attr_price(price_element.get("data-price-amount")) if price_element else None
        if price is None:
            text_element = card.select_one(".special-price .price") or card.select_one(".price")
            price = _clp_from_text(text_element.get_text(" ", strip=True)) if text_element else None
        if not title or not price:
            continue
        hits.append({
            "title": title,
            "url": urljoin(base_url, link.get("href")),
            "price": price,
            "available": "agotado" not in card.get_text(" ", strip=True).lower(),
            "provider": provider,
            "image_url": _image_url(card.select_one("img.product-image-photo") or card.select_one("img"), base_url),
        })
        if len(hits) >= limit:
            break
    return hits


def _prestashop_price(card: Any) -> int | None:
    """Precio al detalle de una tarjeta PrestaShop.

    Librería Olímpica muestra "Precio unitario $ 1850" y "Por mayor $ 1420";
    el mayorista exige cantidades que una lista escolar no alcanza, así que se
    prefiere el precio unitario y el de mayor queda solo como último recurso.
    """
    candidates = card.select(
        ".product-price-and-shipping [itemprop=price], .product-price-and-shipping .priceU, "
        ".product-price-and-shipping .price"
    ) or [
        element for element in (
            card.select_one("span.price"),
            card.select_one(".price.product-price"),
            card.select_one(".price"),
        ) if element is not None
    ]
    texts = [element.get_text(" ", strip=True) for element in candidates]
    retail = [text for text in texts if "mayor" not in text.lower()]
    for text in retail or texts:
        price = _clp_from_text(text)
        if price:
            return price
    return None


def search_prestashop(provider: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """HTML de resultados de PrestaShop, con soporte para temas viejos y nuevos."""
    base_url = PRESTASHOP_STORES[provider]
    path = PRESTASHOP_SEARCH_PATHS.get(provider, "/search")
    response = _get(
        f"{base_url}{path}",
        params={
            "controller": "search",
            "s": query,
            "search_query": query,
            "submit_search": "",
        },
        headers={**HTML_HEADERS, "Referer": f"{base_url}/"},
        timeout=20,
    )
    soup = BeautifulSoup(response.text, "html.parser")
    # Los temas 1.7 también pintan "destacados" y "vistos" con la misma clase;
    # los resultados reales viven dentro de `#js-product-list`.
    cards = (
        soup.select("#js-product-list .js-product-miniature")
        or soup.select("article.js-product-miniature, .js-product-miniature")
        or soup.select("ul.product_list li.ajax_block_product")
    )

    hits: List[Dict[str, Any]] = []
    for card in cards:
        link = (
            card.select_one("h2.product-title a[href]")
            or card.select_one(".product-title a[href]")
            or card.select_one("a.product-name[href]")
        )
        if not link:
            continue
        image = card.select_one("img")
        title = _full_title(
            link.get_text(" ", strip=True),
            link.get("title"),
            image.get("alt") if image else None,
        )
        price = _prestashop_price(card)
        if not title or not price:
            continue
        card_text = card.get_text(" ", strip=True).lower()
        hits.append({
            "title": title,
            "url": urljoin(base_url, link.get("href")),
            "price": price,
            "available": "fuera de stock" not in card_text and "agotado" not in card_text,
            "provider": provider,
            "image_url": _image_url(image, base_url),
        })
        if len(hits) >= limit:
            break
    return hits


def search_tiendanube(provider: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """HTML de resultados de Tiendanube (`/search/?q=`)."""
    base_url = TIENDANUBE_STORES[provider]
    response = _get(f"{base_url}/search/", params={"q": query}, headers=HTML_HEADERS, timeout=25)
    soup = BeautifulSoup(response.text, "html.parser")

    hits: List[Dict[str, Any]] = []
    for card in soup.select(".js-item-product, .item-product"):
        link = card.select_one(".js-item-name[href]") or card.select_one(".item-name[href]")
        if not link:
            continue
        title = link.get_text(" ", strip=True)
        price_element = card.select_one(".js-price-display") or card.select_one(".item-price")
        price = _clp_from_text(price_element.get_text(" ", strip=True)) if price_element else None
        if not title or not price:
            continue
        card_text = card.get_text(" ", strip=True).lower()
        hits.append({
            "title": title,
            "url": urljoin(base_url, link.get("href")),
            "price": price,
            "available": "sin stock" not in card_text and "agotado" not in card_text,
            "provider": provider,
            "image_url": _image_url(card.select_one("img"), base_url),
        })
        if len(hits) >= limit:
            break
    return hits


def _vtex_offer(product: Dict[str, Any]) -> Tuple[int | None, bool, Dict[str, Any]]:
    """Mejor oferta de un producto VTEX: la más barata con stock, si hay."""
    best: Tuple[int | None, bool, Dict[str, Any]] = (None, False, {})
    for item in product.get("items") or []:
        for seller in item.get("sellers") or []:
            offer = seller.get("commertialOffer") or {}
            price = _int_price(offer.get("Price"))
            if not price:
                continue
            available = int(offer.get("AvailableQuantity") or 0) > 0
            current_price, current_available, _ = best
            if (
                current_price is None
                or (available and not current_available)
                or (available == current_available and price < current_price)
            ):
                best = (price, available, item)
    return best


def search_vtex(provider: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """API pública de catálogo VTEX (`/api/catalog_system/pub/products/search`)."""
    base_url = VTEX_STORES[provider]
    # `ft` va codificado con `%20`, igual que lo pide la vitrina.
    response = _get(
        f"{base_url}/api/catalog_system/pub/products/search?ft={quote(query, safe='')}",
        params={"_from": 0, "_to": max(0, min(limit, 10) - 1)},
        headers=JSON_HEADERS,
        timeout=20,
    )
    try:
        products = response.json()
    except ValueError:
        return []
    if not isinstance(products, list):
        return []

    hits: List[Dict[str, Any]] = []
    for product in products:
        title = str(product.get("productName") or "").strip()
        link_text = str(product.get("linkText") or "").strip("/")
        url = product.get("link") or (f"{base_url}/{link_text}/p" if link_text else None)
        price, available, item = _vtex_offer(product)
        if not title or not url or not price:
            continue
        images = item.get("images") or []
        hits.append({
            "title": title,
            "url": urljoin(base_url, url),
            "price": price,
            "available": available,
            "provider": provider,
            "image_url": images[0].get("imageUrl") if images else None,
        })
        if len(hits) >= limit:
            break
    return hits


def search_casaroyal(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Casa Royal (VTEX); se mantiene por compatibilidad con llamadas directas."""
    return search_vtex("casaroyal", query, limit)


def search_petco(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Resultados públicos de Petco Chile (SAP Commerce, ``/search?q=``).

    La vitrina genera una tarjeta de escritorio y otra móvil por producto. Se
    deduplican por URL para no inflar la comparación con el mismo artículo.
    """
    base_url = "https://www.petco.cl"
    response = _get(
        f"{base_url}/search",
        params={"q": query},
        headers=HTML_HEADERS,
        timeout=25,
    )
    soup = BeautifulSoup(response.text, "html.parser")

    hits: List[Dict[str, Any]] = []
    seen_urls: set[str] = set()
    for card in soup.select(".product-item"):
        link = card.select_one(".content-name a[href]") or card.select_one("a.thumb[href]")
        title_element = card.select_one(".content-name")
        price_element = (
            card.select_one(".content-price-plp .discountedPrice")
            or card.select_one(".content-price-plp .price")
            or card.select_one(".content-price-plp")
        )
        if not link or not title_element or not price_element:
            continue
        url = urljoin(base_url, link.get("href"))
        if url in seen_urls:
            continue
        title = title_element.get_text(" ", strip=True)
        price = _clp_from_text(price_element.get_text(" ", strip=True))
        if not title or not price:
            continue
        card_text = card.get_text(" ", strip=True).lower()
        hits.append({
            "title": title,
            "url": url,
            "price": price,
            "available": "agotado" not in card_text,
            "provider": "petco",
            "image_url": _image_url(card.select_one("img"), base_url),
        })
        seen_urls.add(url)
        if len(hits) >= limit:
            break
    return hits


def _jsonld_product_hits(
    soup: BeautifulSoup,
    provider: str,
    base_url: str,
    limit: int,
) -> List[Dict[str, Any]]:
    """Normaliza un ``ItemList`` Schema.org con productos y ofertas."""
    entries: List[Dict[str, Any]] = []
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            payload = json.loads(script.string or script.get_text())
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        if isinstance(payload, dict) and payload.get("@type") == "ItemList":
            entries = payload.get("itemListElement") or []
            break

    hits: List[Dict[str, Any]] = []
    for entry in entries:
        product = entry.get("item") or entry
        offer = product.get("offers") or {}
        title = str(product.get("name") or entry.get("name") or "").strip()
        url = product.get("url") or entry.get("url")
        price = _int_price(offer.get("price"))
        image = product.get("image")
        if isinstance(image, list):
            image = image[0] if image else None
        if isinstance(image, dict):
            image = image.get("url") or image.get("contentUrl")
        if not title or not url or not price:
            continue
        availability = str(offer.get("availability") or "").lower()
        hits.append({
            "title": title,
            "url": urljoin(base_url, url),
            "price": price,
            "available": not availability or availability.endswith("instock"),
            "provider": provider,
            "image_url": urljoin(base_url, image) if image else None,
        })
        if len(hits) >= limit:
            break
    return hits


def search_jumbo(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Catálogo público de Jumbo expuesto como Schema.org ``ItemList``."""
    base_url = "https://www.jumbo.cl"
    response = _get(
        f"{base_url}/busqueda",
        params={"ft": query},
        headers=HTML_HEADERS,
        timeout=30,
        # El CDN de Jumbo entrega ocasionalmente un 404 transitorio para la
        # misma URL que responde 200 inmediatamente después.
        retry_statuses={404, *THROTTLED_STATUS},
    )
    return _jsonld_product_hits(BeautifulSoup(response.text, "html.parser"), "jumbo", base_url, limit)


def search_lider(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Páginas públicas de búsqueda de Líder, con productos Schema.org."""
    base_url = "https://super.lider.cl"
    slug = re.sub(r"[^a-z0-9]+", "-", _normalize_query(query)).strip("-")
    response = _get(
        f"{base_url}/v/{slug}",
        params={},
        headers=HTML_HEADERS,
        timeout=25,
    )
    return _jsonld_product_hits(BeautifulSoup(response.text, "html.parser"), "lider", base_url, limit)


def search_santaisabel(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Datos de vitrina de Santa Isabel incluidos en ``window.__renderData``."""
    base_url = "https://www.santaisabel.cl"
    response = _get(
        # Esta vitrina responde 404 cuando los espacios llegan como `+`, que es
        # la codificación normal de `requests` para query params. Se fuerza
        # `%20`, igual que lo hace el navegador de Santa Isabel.
        f"{base_url}/busqueda?ft={quote(query, safe='')}",
        params={},
        headers=HTML_HEADERS,
        timeout=25,
    )
    soup = BeautifulSoup(response.text, "html.parser")
    render_script = next(
        (
            script.string or script.get_text()
            for script in soup.select("script")
            if "window.__renderData" in (script.string or script.get_text())
        ),
        "",
    )
    encoded = re.search(
        r'window\.__renderData\s*=\s*("(?:\\.|[^"\\])*")\s*;',
        render_script,
        re.S,
    )
    if not encoded:
        return []
    try:
        data = json.loads(json.loads(encoded.group(1)))
        products = data["plp"]["plp_products"]["products"]
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return []

    hits: List[Dict[str, Any]] = []
    for product in products:
        items = product.get("items") or []
        item = items[0] if items else {}
        sellers = item.get("sellers") or []
        offer = (sellers[0].get("commertialOffer") or {}) if sellers else {}
        title = str(product.get("productName") or item.get("name") or "").strip()
        link_text = str(product.get("linkText") or "").strip("/")
        price = _int_price(offer.get("Price"))
        images = item.get("images") or []
        if not title or not link_text or not price:
            continue
        hits.append({
            "title": title,
            "url": f"{base_url}/{link_text}/p",
            "price": price,
            "available": int(offer.get("AvailableQuantity") or 0) > 0,
            "provider": "santaisabel",
            "image_url": images[0].get("imageUrl") if images else None,
        })
        if len(hits) >= limit:
            break
    return hits


def search_tottus(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Resultados de Tottus incluidos como datos de la página Next.js."""
    base_url = "https://www.tottus.cl"
    response = _get(
        f"{base_url}/tottus-cl/buscar",
        params={"Ntt": query},
        headers=HTML_HEADERS,
        timeout=30,
    )
    soup = BeautifulSoup(response.text, "html.parser")
    next_data = soup.select_one("#__NEXT_DATA__")
    if not next_data:
        return []
    try:
        products = json.loads(next_data.string or next_data.get_text())["props"]["pageProps"]["results"]
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return []

    hits: List[Dict[str, Any]] = []
    for product in products:
        prices = product.get("prices") or []
        selling_price = next((price for price in prices if not price.get("crossed")), None)
        raw_price = "".join(str(part) for part in (selling_price or {}).get("price") or [])
        price = _clp_from_text(raw_price)
        title = str(product.get("displayName") or "").strip()
        url = product.get("url")
        images = product.get("mediaUrls") or []
        if not title or not url or not price:
            continue
        hits.append({
            "title": title,
            "url": urljoin(base_url, url),
            "price": price,
            "available": True,
            "provider": "tottus",
            "image_url": images[0] if images else None,
        })
        if len(hits) >= limit:
            break
    return hits


#: Todas las tiendas que resuelve `search_structured_store`, en orden de plataforma.
STRUCTURED_PROVIDERS: List[str] = [
    *SHOPIFY_STORES,
    *WOOCOMMERCE_STORES,
    *JUMPSELLER_STORES,
    *MAGENTO_STORES,
    *PRESTASHOP_STORES,
    *TIENDANUBE_STORES,
    *VTEX_STORES,
    "petco",
    "jumbo",
    "lider",
    "santaisabel",
    "tottus",
]


def store_base_url(provider: str) -> str | None:
    """URL pública de una tienda estructurada, para enlazarla desde el frontend."""
    for stores in (
        SHOPIFY_STORES, WOOCOMMERCE_STORES, JUMPSELLER_STORES,
        MAGENTO_STORES, PRESTASHOP_STORES, TIENDANUBE_STORES, VTEX_STORES,
    ):
        if provider in stores:
            return stores[provider]
    if provider == "petco":
        return "https://www.petco.cl"
    if provider == "jumbo":
        return "https://www.jumbo.cl"
    if provider == "lider":
        return "https://super.lider.cl"
    if provider == "santaisabel":
        return "https://www.santaisabel.cl"
    if provider == "tottus":
        return "https://www.tottus.cl"
    return None


def search_structured_store(provider: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    query = (query or "").strip()
    if not query:
        return []
    if provider in SHOPIFY_STORES:
        return search_shopify(provider, query, limit)
    if provider in WOOCOMMERCE_STORES:
        return search_woocommerce(provider, query, limit)
    if provider in JUMPSELLER_STORES:
        return search_jumpseller(provider, query, limit)
    if provider in MAGENTO_STORES:
        return search_magento(provider, query, limit)
    if provider in PRESTASHOP_STORES:
        return search_prestashop(provider, query, limit)
    if provider in TIENDANUBE_STORES:
        return search_tiendanube(provider, query, limit)
    if provider in VTEX_STORES:
        return search_vtex(provider, query, limit)
    if provider == "petco":
        return search_petco(query, limit)
    if provider == "jumbo":
        return search_jumbo(query, limit)
    if provider == "lider":
        return search_lider(query, limit)
    if provider == "santaisabel":
        return search_santaisabel(query, limit)
    if provider == "tottus":
        return search_tottus(query, limit)
    raise ValueError(f"Proveedor estructurado desconocido: {provider}")
