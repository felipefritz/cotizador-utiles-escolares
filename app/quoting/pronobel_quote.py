"""
Quoting module for Pronobel.cl
"""
from __future__ import annotations

from typing import Any, Dict

from app.providers.pronobel import PronobelClient


def quote_pronobel(query: str, limit: int = 5) -> Dict[str, Any]:
    """
    Busca productos en Pronobel.cl y retorna resultados con estructura estándar.
    
    Args:
        query: Término de búsqueda
        limit: Número máximo de resultados
    
    Returns:
        Dict con estructura:
        {
            "query": str,
            "status": "ok" | "not_found" | "error",
            "hits": [...],
            "error": str | None,
        }
    """
    cli = PronobelClient()

    try:
        hits = cli.search(query, limit=limit)
        if not hits:
            return {
                "query": query,
                "status": "not_found",
                "hits": [],
                "error": None,
            }

        return {
            "query": query,
            "status": "ok",
            "hits": hits,
            "error": None,
        }
    except Exception as e:
        return {
            "query": query,
            "status": "error",
            "hits": [],
            "error": str(e),
        }
