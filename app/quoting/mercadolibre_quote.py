"""
MercadoLibre Chile quoting provider.

Uses MercadoLibre's public search endpoint for the Chile site (MLC).
"""
from __future__ import annotations

import os
from typing import Any, Dict, List

import requests

from app.quoting.http_utils import request_kwargs


MERCADOLIBRE_API_URL = "https://api.mercadolibre.com/sites/{site_id}/search"


def quote_mercadolibre(query: str, limit: int = 8) -> Dict[str, Any]:
    site_id = os.getenv("MERCADOLIBRE_SITE_ID", "MLC")
    params = {
        "q": query,
        "limit": max(1, min(limit, 20)),
    }
    headers = {
        "Accept": "application/json",
        "User-Agent": "PrecioFast/1.0",
    }
    access_token = os.getenv("MERCADOLIBRE_ACCESS_TOKEN", "").strip()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    try:
        response = requests.get(
            MERCADOLIBRE_API_URL.format(site_id=site_id),
            params=params,
            headers=headers,
            timeout=15,
            **request_kwargs(),
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": str(exc),
        }

    hits: List[Dict[str, Any]] = []
    for item in data.get("results") or []:
        if not isinstance(item, dict):
            continue

        title = item.get("title")
        url = item.get("permalink")
        price = item.get("price")
        if not title or not url:
            continue

        try:
            normalized_price = int(round(float(price))) if price is not None else None
        except (TypeError, ValueError):
            normalized_price = None

        hits.append({
            "title": title,
            "url": url,
            "price": normalized_price,
            "available": item.get("available_quantity", 0) != 0,
            "provider": "mercadolibre",
            "merchant": item.get("seller", {}).get("nickname"),
            "sku": item.get("id"),
            "image_url": item.get("thumbnail"),
            "condition": item.get("condition"),
            "currency_id": item.get("currency_id"),
        })

    return {
        "query": query,
        "status": "ok" if hits else "not_found",
        "hits": hits,
        "error": None,
    }
