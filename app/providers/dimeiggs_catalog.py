from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import List, Optional

import requests

from app.quoting.http_utils import request_kwargs


@dataclass
class ProductHit:
    title: str
    brand: Optional[str]
    url: str
    sku: Optional[str] = None
    score: Optional[float] = None
    image_url: Optional[str] = None
    price: Optional[int] = None
    available: Optional[bool] = None


def _offer_from_items(items: list) -> tuple[Optional[str], Optional[int], Optional[bool]]:
    """SKU, precio y stock de la mejor oferta del producto.

    La respuesta de `suggestionProducts` trae `items[].sellers[].commertialOffer`
    con `Price` y `AvailableQuantity`; se prefiere una oferta con stock.
    """
    best: tuple[Optional[str], Optional[int], Optional[bool]] = (None, None, None)
    for item in items or []:
        if not isinstance(item, dict):
            continue
        sku = item.get("itemId")
        for seller in item.get("sellers") or []:
            offer = (seller or {}).get("commertialOffer") or {}
            price = offer.get("Price")
            if not isinstance(price, (int, float)) or price <= 0:
                continue
            quantity = offer.get("AvailableQuantity")
            available = bool(quantity) if isinstance(quantity, (int, float)) else None
            if best[1] is None or (available and not best[2]):
                best = (sku, int(round(price)), available)
        if best[0] is None and sku:
            best = (sku, best[1], best[2])
    return best


class DimeiggsCatalogClient:
    """
    Busca productos en Dimeiggs usando GraphQL persistedQuery (suggestionProducts),
    que es mucho más estable que /api/catalog_system/.../search (que a veces da 400).
    """

    BASE = "https://www.dimeiggs.cl"
    GRAPHQL = (
        "https://www.dimeiggs.cl/_v/segment/graphql/v1"
        "?workspace=master&maxAge=short&appsEtag=remove&domain=store&locale=es-CL"
    )

    OPERATION = "suggestionProducts"
    SHA256 = "704c20442c5227eb5d8c75bfd410cb86d3b07c1fc719fbd960239f04586728e0"

    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self.s = requests.Session()
        # headers ayudan a evitar bloqueos raros
        self.s.headers.update({
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Referer": self.BASE + "/",
        })

    def search(self, term: str, limit: int = 8) -> List[ProductHit]:
        term = (term or "").strip()
        if not term:
            return []

        vars_obj = {
            "term": term,
            "productOrigin": "BIGGY",
            "indexingType": "API",
        }
        vars_b64 = base64.b64encode(json.dumps(
            vars_obj).encode("utf-8")).decode("utf-8")

        params = {
            "operationName": self.OPERATION,
            "variables": "{}",
            "extensions": json.dumps({
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": self.SHA256,
                    "sender": "vtex.search@1.x",
                    "provider": "vtex.search@1.x",
                },
                "variables": vars_b64,
            }),
        }

        r = self.s.get(self.GRAPHQL, params=params, timeout=self.timeout, **request_kwargs())
        r.raise_for_status()

        data = r.json() or {}
        # estructura típica: data -> suggestionProducts -> products
        products = (
            (data.get("data") or {})
            .get("suggestionProducts") or {}
        ).get("products") or []

        hits: List[ProductHit] = []
        for p in products:
            title = p.get("productName") or p.get("name") or ""
            if not title:
                continue

            link = p.get("linkText") or ""
            url = self.BASE + "/" + link + \
                "/p" if link else (p.get("href") or "")

            brand = p.get("brand") or p.get("brandName")
            image_url = None

            items = p.get("items") or []
            sku, price, available = _offer_from_items(items if isinstance(items, list) else [])
            if items and isinstance(items, list):
                # Intentar extraer imagen del primer item
                first_item = items[0] if items else {}
                if isinstance(first_item, dict):
                    # Buscar en images
                    images = first_item.get("images") or []
                    if images and isinstance(images, list) and len(images) > 0:
                        first_image = images[0]
                        if isinstance(first_image, dict):
                            image_url = first_image.get("imageUrl") or first_image.get("url")

            # Si no encontró imagen en items, buscar en el producto
            if not image_url:
                images = p.get("images") or []
                if images and isinstance(images, list) and len(images) > 0:
                    first_image = images[0]
                    if isinstance(first_image, dict):
                        image_url = first_image.get("imageUrl") or first_image.get("url")
                    elif isinstance(first_image, str):
                        image_url = first_image

            hits.append(ProductHit(
                title=title,
                brand=brand,
                url=url,
                sku=sku,
                image_url=image_url,
                price=price,
                available=available,
            ))

            if len(hits) >= limit:
                break

        return hits
