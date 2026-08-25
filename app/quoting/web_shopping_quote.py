"""
External shopping search provider.

Uses SerpAPI's Google Shopping engine when SERPAPI_API_KEY is configured.
This is intended as a broad fallback for product categories that do not yet
have a dedicated store scraper.
"""
from __future__ import annotations

import os
import re
from typing import Any, Dict, Iterable, List, Optional

import requests

from app.quoting.http_utils import request_kwargs


SERPAPI_URL = "https://serpapi.com/search.json"


def _parse_price(value: Any) -> Optional[int]:
    if isinstance(value, (int, float)):
        return int(round(value))
    if not isinstance(value, str):
        return None

    cleaned = re.sub(r"[^\d,\.]", "", value)
    if not cleaned:
        return None

    # CLP prices often arrive as "$12.990"; US-style decimals as "12.99".
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(",", "")
    elif "." in cleaned and len(cleaned.rsplit(".", 1)[-1]) == 3:
        cleaned = cleaned.replace(".", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")

    try:
        return int(round(float(cleaned)))
    except ValueError:
        return None


def _iter_shopping_blocks(data: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    for key in ("shopping_results", "inline_shopping_results"):
        for item in data.get(key) or []:
            if isinstance(item, dict):
                yield item

    for group in data.get("categorized_shopping_results") or []:
        for item in (group or {}).get("shopping_results") or []:
            if isinstance(item, dict):
                yield item


def quote_web_shopping(query: str, limit: int = 8) -> Dict[str, Any]:
    api_key = os.getenv("SERPAPI_API_KEY", "").strip()
    if not api_key:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": "SERPAPI_API_KEY no configurada.",
        }

    params = {
        "engine": "google_shopping",
        "q": query,
        "api_key": api_key,
        "gl": os.getenv("SERPAPI_GL", "cl"),
        "hl": os.getenv("SERPAPI_HL", "es-419"),
        "google_domain": os.getenv("SERPAPI_GOOGLE_DOMAIN", "google.cl"),
        "location": os.getenv("SERPAPI_LOCATION", "Santiago, Chile"),
        "num": max(1, min(limit, 20)),
    }

    try:
        response = requests.get(SERPAPI_URL, params=params, timeout=15, **request_kwargs())
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
    seen_urls = set()

    for item in _iter_shopping_blocks(data):
        title = (item.get("title") or "").strip()
        url = item.get("link") or item.get("product_link") or item.get("serpapi_link")
        if not title or not url or url in seen_urls:
            continue
        seen_urls.add(url)

        price = _parse_price(item.get("extracted_price"))
        if price is None:
            price = _parse_price(item.get("price"))

        hits.append({
            "title": title,
            "url": url,
            "price": price,
            "available": True,
            "provider": "web_shopping",
            "merchant": item.get("source"),
            "image_url": item.get("thumbnail") or item.get("serpapi_thumbnail"),
            "rating": item.get("rating"),
            "reviews": item.get("reviews"),
        })

        if len(hits) >= limit:
            break

    return {
        "query": query,
        "status": "ok" if hits else "not_found",
        "hits": hits,
        "error": None,
    }
