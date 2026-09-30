"""
Lasecretaria.cl - Tienda online de útiles escolares y artículos de papelería.
Cliente para búsqueda de productos.

La tienda dejó PrestaShop por una aplicación Laravel + Inertia.js: el HTML del
buscador ya no trae `<article>` (se pintan en el navegador), pero incluye el
estado completo de la página como JSON en `<script data-page="app">`. De ahí
salen nombre, precio, stock, URL e imagen de cada producto.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from app.quoting.http_utils import request_kwargs


class LasecretariaClient:
    """Busca productos en Lasecretaria.cl - tienda de útiles escolares."""

    def __init__(self, timeout: int = 15):
        self.base_url = "https://www.lasecretaria.cl"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "es-CL,es;q=0.9",
        })

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Busca en `/busqueda?s=`.

        Los errores se propagan a `quote_lasecretaria`, que los convierte en
        status "error". Tragarlos acá haría que una caída de la tienda se viera
        como "sin resultados".
        """
        query = (query or "").strip()
        if not query:
            return []
        r = self.session.get(
            f"{self.base_url}/busqueda",
            params={"s": query},
            timeout=self.timeout,
            **request_kwargs(),
        )
        r.raise_for_status()
        return self._parse_results(r.text, limit)

    def _page_state(self, html: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html, "html.parser")
        script = soup.select_one('script[data-page="app"]')
        if script is not None:
            raw = script.string or script.get_text()
        else:
            holder = soup.select_one("[data-page]")
            raw = holder.get("data-page") if holder is not None else ""
        try:
            state = json.loads(raw or "{}")
        except (TypeError, ValueError):
            return {}
        return state if isinstance(state, dict) else {}

    def _parse_results(self, html: str, limit: int) -> List[Dict[str, Any]]:
        """Extrae productos del estado Inertia de la página de búsqueda."""
        products = (self._page_state(html).get("props") or {}).get("products") or []
        if isinstance(products, dict):
            products = products.get("data") or []

        hits: List[Dict[str, Any]] = []
        for product in products:
            if not isinstance(product, dict):
                continue
            title = str(product.get("name") or "").strip()
            price = self._price(product)
            path = product.get("legacyUrl") or (f"/{product['slug']}" if product.get("slug") else None)
            if not title or not price or not path:
                continue
            media = product.get("media") or []
            image = media[0].get("publicPath") if media and isinstance(media[0], dict) else None
            hits.append({
                "title": title,
                "url": urljoin(self.base_url, path),
                "price": price,
                "image_url": urljoin(self.base_url, image) if image else None,
                "available": product.get("inStock") is not False,
                "provider": "lasecretaria",
            })
            if len(hits) >= limit:
                break
        return hits

    @staticmethod
    def _price(product: Dict[str, Any]) -> Optional[int]:
        for offer in product.get("prices") or []:
            amount = offer.get("amount") if isinstance(offer, dict) else None
            try:
                value = int(round(float(amount)))
            except (TypeError, ValueError):
                continue
            if value > 0:
                return value
        raw = product.get("price")
        if isinstance(raw, (int, float)) and raw > 0:
            return int(raw)
        if isinstance(raw, str):
            digits = re.sub(r"[^0-9]", "", raw)
            return int(digits) if digits else None
        return None
