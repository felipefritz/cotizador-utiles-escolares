from __future__ import annotations

from typing import Any, Dict, Optional

import requests

from app.providers.dimeiggs_catalog import DimeiggsCatalogClient
from app.quoting.http_utils import request_kwargs


def _get_price_by_sku(sku: str, timeout: int = 5) -> Optional[int]:
    """Precio de un SKU puntual, solo como respaldo.

    Se filtra con `fq=skuId:<sku>`. La versión anterior usaba `FT=<sku>`
    (búsqueda de texto): VTEX ignora el número y devuelve su ranking por
    defecto, así que *todos* los productos quedaban con el precio del primer
    resultado genérico (en la validación en vivo, una carpeta de $320).
    """
    if not sku:
        return None
    try:
        r = requests.get(
            "https://www.dimeiggs.cl/api/catalog_system/pub/products/search",
            params={"fq": f"skuId:{sku}"},
            timeout=timeout,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
            **request_kwargs(),
        )
        r.raise_for_status()
        for product in r.json() or []:
            for item in product.get("items") or []:
                if str(item.get("itemId")) != str(sku):
                    continue
                for seller in item.get("sellers") or []:
                    price = (seller.get("commertialOffer") or {}).get("Price")
                    if isinstance(price, (int, float)) and price > 0:
                        return int(round(price))
        return None
    except Exception:
        # El respaldo nunca debe hacer fallar la búsqueda.
        return None


def quote_dimeiggs(query: str, limit: int = 8) -> Dict[str, Any]:
    cli = DimeiggsCatalogClient()

    try:
        hits = cli.search(query, limit=limit)
        if not hits:
            return {
                "query": query,
                "status": "not_found",
                "hits": [],
                "error": None,
            }

        # El precio y el stock vienen en la misma respuesta de sugerencias
        # (`items[].sellers[].commertialOffer`). Solo se consulta el catálogo
        # por SKU cuando esa oferta no trae precio.
        hits_with_prices = []
        for hit in hits:
            hit_dict = hit.__dict__.copy()
            if not hit_dict.get("price") and hit.sku:
                hit_dict["price"] = _get_price_by_sku(hit.sku)
            hits_with_prices.append(hit_dict)

        return {
            "query": query,
            "status": "ok",
            "hits": hits_with_prices,
            "error": None,
        }

    except requests.HTTPError as e:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": f"HTTPError: {str(e)}",
        }
    except Exception as e:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": str(e),
        }
