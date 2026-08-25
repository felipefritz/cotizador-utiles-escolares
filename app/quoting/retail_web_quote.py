"""
Retail web quoting provider for stores without a stable public API.

Requires SERPAPI_API_KEY. It first tries Google Shopping results filtered by
merchant/domain and then falls back to organic Google results where prices can
often be parsed from snippets.
"""
from __future__ import annotations

import os
from typing import Any, Dict, Iterable, List, Optional, Sequence

import requests

from app.quoting.http_utils import request_kwargs
from app.quoting.web_shopping_quote import SERPAPI_URL, _iter_shopping_blocks, _parse_price


RETAILERS: Dict[str, Dict[str, Any]] = {
    "mercadolibre": {
        "label": "MercadoLibre",
        "domains": ("mercadolibre.cl",),
        "keywords": ("mercadolibre", "mercado libre"),
    },
    "solotodo": {
        "label": "SoloTodo",
        "domains": ("solotodo.cl",),
        "keywords": ("solotodo", "solo todo"),
    },
    "sodimac": {
        "label": "Sodimac",
        "domains": ("sodimac.cl", "sodimac.falabella.com"),
        "keywords": ("sodimac",),
    },
    "falabella": {
        "label": "Falabella",
        "domains": ("falabella.com",),
        "keywords": ("falabella",),
    },
    "ripley": {
        "label": "Ripley",
        "domains": ("ripley.cl",),
        "keywords": ("ripley",),
    },
    "pcfactory": {
        "label": "PC Factory",
        "domains": ("pcfactory.cl",),
        "keywords": ("pc factory", "pcfactory"),
    },
    "paris": {
        "label": "Paris",
        "domains": ("paris.cl",),
        "keywords": ("paris",),
    },
    "lider_web": {
        "label": "Lider",
        "domains": ("lider.cl",),
        "keywords": ("lider", "líder"),
    },
    "jumbo_web": {
        "label": "Jumbo",
        "domains": ("jumbo.cl",),
        "keywords": ("jumbo",),
    },
}


def _matches_store(item: Dict[str, Any], domains: Sequence[str], keywords: Sequence[str]) -> bool:
    haystack = " ".join(
        str(item.get(field) or "")
        for field in ("source", "title", "link", "product_link", "url", "snippet")
    ).lower()
    return any(domain.lower() in haystack for domain in domains) or any(keyword.lower() in haystack for keyword in keywords)


def _shopping_results(query: str, retailer: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
    params = {
        "engine": "google_shopping",
        "q": f"{query} {retailer['label']}",
        "api_key": os.getenv("SERPAPI_API_KEY", "").strip(),
        "gl": os.getenv("SERPAPI_GL", "cl"),
        "hl": os.getenv("SERPAPI_HL", "es-419"),
        "google_domain": os.getenv("SERPAPI_GOOGLE_DOMAIN", "google.cl"),
        "location": os.getenv("SERPAPI_LOCATION", "Santiago, Chile"),
        "num": max(1, min(limit * 2, 20)),
    }
    response = requests.get(SERPAPI_URL, params=params, timeout=15, **request_kwargs())
    response.raise_for_status()
    data = response.json()

    hits: List[Dict[str, Any]] = []
    for item in _iter_shopping_blocks(data):
        if not _matches_store(item, retailer["domains"], retailer["keywords"]):
            continue
        title = item.get("title")
        url = item.get("link") or item.get("product_link") or item.get("serpapi_link")
        if not title or not url:
            continue
        price = _parse_price(item.get("extracted_price"))
        if price is None:
            price = _parse_price(item.get("price"))
        hits.append({
            "title": title,
            "url": url,
            "price": price,
            "available": True,
            "merchant": item.get("source") or retailer["label"],
            "image_url": item.get("thumbnail") or item.get("serpapi_thumbnail"),
            "rating": item.get("rating"),
            "reviews": item.get("reviews"),
        })
        if len(hits) >= limit:
            break
    return hits


def _organic_results(query: str, retailer: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
    site_filter = " OR ".join(f"site:{domain}" for domain in retailer["domains"])
    params = {
        "engine": "google",
        "q": f"{query} ({site_filter})",
        "api_key": os.getenv("SERPAPI_API_KEY", "").strip(),
        "gl": os.getenv("SERPAPI_GL", "cl"),
        "hl": os.getenv("SERPAPI_HL", "es-419"),
        "google_domain": os.getenv("SERPAPI_GOOGLE_DOMAIN", "google.cl"),
        "location": os.getenv("SERPAPI_LOCATION", "Santiago, Chile"),
        "num": max(1, min(limit, 10)),
    }
    response = requests.get(SERPAPI_URL, params=params, timeout=15, **request_kwargs())
    response.raise_for_status()
    data = response.json()

    hits: List[Dict[str, Any]] = []
    for item in data.get("organic_results") or []:
        if not isinstance(item, dict) or not _matches_store(item, retailer["domains"], retailer["keywords"]):
            continue
        title = item.get("title")
        url = item.get("link")
        if not title or not url:
            continue
        snippet = item.get("snippet") or ""
        hits.append({
            "title": title,
            "url": url,
            "price": _parse_price(f"{title} {snippet}"),
            "available": True,
            "merchant": retailer["label"],
            "image_url": item.get("thumbnail"),
        })
        if len(hits) >= limit:
            break
    return hits


def quote_retail_web(provider_id: str, query: str, limit: int = 8) -> Dict[str, Any]:
    api_key = os.getenv("SERPAPI_API_KEY", "").strip()
    if not api_key:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": "SERPAPI_API_KEY no configurada.",
        }

    retailer = RETAILERS.get(provider_id)
    if not retailer:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": f"Retailer no configurado: {provider_id}",
        }

    try:
        hits = _shopping_results(query, retailer, limit)
        if len(hits) < max(2, limit // 2):
            seen = {hit["url"] for hit in hits}
            for hit in _organic_results(query, retailer, limit):
                if hit["url"] not in seen:
                    hits.append(hit)
                    seen.add(hit["url"])
                if len(hits) >= limit:
                    break
    except Exception as exc:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": str(exc),
        }

    for hit in hits:
        hit["provider"] = provider_id

    return {
        "query": query,
        "status": "ok" if hits else "not_found",
        "hits": hits,
        "error": None,
    }
