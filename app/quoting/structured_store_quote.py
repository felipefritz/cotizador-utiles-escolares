"""Adaptador de tiendas estructuradas al contrato común de cotización."""
from __future__ import annotations

from typing import Any, Dict

from app.providers.structured_stores import search_structured_store


def quote_structured_store(provider: str, query: str, limit: int = 5) -> Dict[str, Any]:
    try:
        hits = search_structured_store(provider, query, limit)
        return {
            "query": query,
            "status": "ok" if hits else "not_found",
            "hits": hits,
            "error": None,
        }
    except Exception as exc:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": str(exc),
        }
