from __future__ import annotations

from typing import Any, Dict

import requests

from app.providers.dimeiggs_catalog import DimeiggsCatalogClient


def _get_price_by_sku(sku: str, timeout: int = 5) -> int | None:
    """
    Obtiene el precio de un producto usando su SKU.
    
    Busca en: https://www.dimeiggs.cl/api/catalog_system/pub/products/search?FT=<sku>
    
    Args:
        sku: SKU del producto (ej: "14868")
        timeout: Timeout en segundos
    
    Returns:
        Precio en CLP, o None si no encuentra
    """
    if not sku:
        return None
    
    try:
        url = f"https://www.dimeiggs.cl/api/catalog_system/pub/products/search?FT={sku}&_from=0&_to=5"
        r = requests.get(url, timeout=timeout, headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
        })
        r.raise_for_status()
        
        products = r.json() or []
        if not products:
            return None
        
        # Buscar el primer item con precio
        product = products[0]
        items = product.get("items", [])
        if not items:
            return None
        
        item = items[0]
        sellers = item.get("sellers", [])
        if not sellers:
            return None
        
        # Tomar el primer vendedor (generalmente Dimeiggs mismo)
        seller = sellers[0]
        offer = seller.get("commertialOffer", {})
        price = offer.get("Price")
        
        if price is not None:
            try:
                return int(float(price))
            except (ValueError, TypeError):
                return None
        
        return None
    
    except Exception as e:
        # Si hay error, retornar None (no hacer fallar la búsqueda)
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

        # Obtener precios para cada hit
        hits_with_prices = []
        for hit in hits:
            price = _get_price_by_sku(hit.sku) if hit.sku else None
            hit_dict = hit.__dict__.copy()
            hit_dict["price"] = price
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
