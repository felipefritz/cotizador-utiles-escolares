from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import requests


@dataclass
class ProductQuote:
    provider: str
    query: str
    name: str
    url: str
    price: Optional[int]          # CLP entero (si viene)
    available: Optional[bool]     # si se puede inferir
    sku: Optional[str] = None


class DimeiggsClient:
    """
    VTEX GraphQL persistedQuery: operationName=suggestionProducts
    El término va en extensions.variables como base64 de un JSON.
    """
    BASE_URL = "https://www.dimeiggs.cl/_v/segment/graphql/v1"

    PERSISTED = {
        "version": 1,
        "sha256Hash": "704c20442c5227eb5d8c75bfd410cb86d3b07c1fc719fbd960239f04586728e0",
        "sender": "vtex.search@1.x",
        "provider": "vtex.search@1.x",
    }

    def __init__(self, timeout: int = 25):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
            "Referer": "https://www.dimeiggs.cl/",
            "Origin": "https://www.dimeiggs.cl",
        })

    def search_suggestions(self, term: str, product_origin: str = "BIGGY", indexing_type: str = "API") -> Dict[str, Any]:
        """
        Retorna el JSON completo del endpoint suggestionProducts.
        """
        inner_vars = {
            "term": term,
            "productOrigin": product_origin,
            "indexingType": indexing_type,
        }

        # VTEX espera este JSON como base64 en extensions.variables
        inner_vars_b64 = base64.b64encode(json.dumps(inner_vars, ensure_ascii=False).encode("utf-8")).decode("utf-8")

        extensions = {
            "persistedQuery": self.PERSISTED,
            "variables": inner_vars_b64,
        }

        params = {
            "workspace": "master",
            "maxAge": "short",
            "appsEtag": "remove",
            "domain": "store",
            "locale": "es-CL",
            "operationName": "suggestionProducts",
            "variables": "{}",  # queda vacío, el real va dentro de extensions.variables
            "extensions": json.dumps(extensions, ensure_ascii=False),
        }

        r = self.session.get(self.BASE_URL, params=params, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def search(self, term: str, limit: int = 8) -> List[Dict[str, Any]]:
        """
        Devuelve lista de dicts con productos sugeridos.
        OJO: el endpoint de sugerencias a veces no trae precio/stock.
        """
        data = self.search_suggestions(term)

        # Posibles rutas según VTEX app; dejamos robusto
        products = (
            (data.get("data") or {}).get("suggestionProducts", {}).get("products")
            or (data.get("data") or {}).get("suggestionProducts", {}).get("items")
            or []
        )

        out: List[Dict[str, Any]] = []
        for p in products[:limit]:
            name = (p.get("name") or p.get("productName") or "").strip()
            slug = p.get("slug") or p.get("linkText")
            product_id = str(p.get("productId") or p.get("id") or "") or None

            # URL: si viene "url" úsala; si no, construimos con slug
            url = p.get("url") or (f"https://www.dimeiggs.cl/{slug}/p" if slug else "https://www.dimeiggs.cl/")

            # Muchos VTEX suggestion endpoints NO traen precio.
            price = self._extract_price_clp(p)
            available = self._extract_availability(p)

            out.append({
                "provider": "dimeiggs",
                "query": term,
                "title": name,
                "url": url,
                "price": price,
                "available": available,
                "sku": product_id,
            })

        return out

    def _extract_price_clp(self, p: Dict[str, Any]) -> Optional[int]:
        # Si viene directo
        for key in ("price", "Price", "sellingPrice", "bestPrice"):
            v = p.get(key)
            if isinstance(v, (int, float)) and v > 0:
                return int(round(v))

        # Si viene por sellers/offer (a veces no viene en suggestions)
        sellers = p.get("sellers") or []
        if isinstance(sellers, list) and sellers:
            offer = sellers[0].get("commertialOffer") or {}
            v = offer.get("Price") or offer.get("price")
            if isinstance(v, (int, float)) and v > 0:
                return int(round(v))

        return None

    def _extract_availability(self, p: Dict[str, Any]) -> Optional[bool]:
        v = p.get("available")
        if isinstance(v, bool):
            return v

        sellers = p.get("sellers") or []
        if isinstance(sellers, list) and sellers:
            offer = sellers[0].get("commertialOffer") or {}
            q = offer.get("AvailableQuantity")
            if isinstance(q, (int, float)):
                return q > 0

        return None
