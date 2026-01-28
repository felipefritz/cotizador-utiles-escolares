"""
Multi-provider quoting aggregator.
Combina resultados de múltiples proveedores (Dimeiggs, Jumbo, Lápiz López, Librería Nacional, etc.)
y devuelve hits consolidados, ordenados por precio y relevancia.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import requests
from app.providers.dimeiggs_catalog import DimeiggsCatalogClient
from app.quoting.libreria_nacional_quote import quote_libreria_nacional
from app.quoting.dimeiggs_quote import quote_dimeiggs
from app.quoting.jamila_quote import quote_jamila
from app.quoting.coloranimal_quote import quote_coloranimal
from app.quoting.pronobel_quote import quote_pronobel
from app.quoting.prisa_quote import quote_prisa
from app.quoting.lasecretaria_quote import quote_lasecretaria
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed


STOPWORDS = {
    "de", "del", "la", "el", "los", "las", "y", "o", "con", "para", "por", 
    "un", "una", "pliego", "caja", "unidad", "unidades", "pack", "set", 
    "pz", "pzas", "x", "bolsa"
}


def _normalize_text(s: str) -> str:
    """Normaliza texto para búsqueda: minúsculas, sin acentos, espacios limpios."""
    s = s.lower().strip()
    # Quita acentos
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    # Solo alfanuméricos y espacios
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    # Espacios múltiples
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _token_overlap(query: str, title: str, min_ratio: float = 0.5) -> float:
    """
    Calcula qué porcentaje de tokens de la query aparecen en el título.
    Retorna score entre 0.0 (sin coincidencia) y 1.0 (coincidencia perfecta).
    """
    q_norm = _normalize_text(query)
    t_norm = _normalize_text(title)

    q_tokens = {w for w in q_norm.split() if w not in STOPWORDS and len(w) > 2}
    t_tokens = {w for w in t_norm.split() if w not in STOPWORDS and len(w) > 2}

    if not q_tokens:
        return 0.0

    overlap = len(q_tokens & t_tokens)
    ratio = overlap / len(q_tokens)

    return ratio


def _quote_dimeiggs(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta búsqueda en Dimeiggs (usando quote_dimeiggs mejorado con precios)."""
    try:
        # Usar la función mejorada que incluye precios
        result = quote_dimeiggs(query, limit=limit)
        
        if result["status"] == "not_found":
            return "dimeiggs", [], None
        
        if result["status"] == "error":
            return "dimeiggs", [], result.get("error")
        
        # Procesar hits
        hits = []
        for hit in result.get("hits", []):
            relevance = _token_overlap(query, hit.get("title", ""))
            hits.append({
                "title": hit.get("title"),
                "url": hit.get("url"),
                "price": hit.get("price"),  # Ahora sí tiene precio
                "available": True,
                "provider": "dimeiggs",
                "relevance": relevance,
                "sku": hit.get("sku"),
                "image_url": hit.get("image_url"),  # Agregar imagen
            })
        
        return "dimeiggs", hits, None
    
    except Exception as e:
        return "dimeiggs", [], str(e)


def _quote_jumbo(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """
    DEPRECADO: Jumbo no es scrapeable (protección anti-bot PerimeterX).
    Devuelve lista vacía.
    """
    return "jumbo", [], "Jumbo está bloqueado con protección anti-bot. Servicio no disponible."


def _quote_lider(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """
    DEPRECADO: Líder no es scrapeable (protección anti-bot PerimeterX).
    Devuelve lista vacía.
    """
    return "lider", [], "Líder está bloqueado con protección anti-bot. Servicio no disponible."


def _quote_lapiz_lopez(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """
    DEPRECADO: Lápiz López no es scrapeable (Cloudflare 403 + WooCommerce sin JS).
    Devuelve lista vacía.
    """
    return "lapiz_lopez", [], "Lápiz López no es accesible (Cloudflare + JavaScript requerido). Servicio no disponible."


def _quote_libreria_nacional(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta búsqueda en Librería Nacional. Retorna (provider, hits, error)."""
    try:
        result = quote_libreria_nacional(query, limit=limit)
        if result["status"] in ("ok", "not_found"):
            hits = []
            for hit in result.get("hits", []):
                relevance = _token_overlap(query, hit.get("title", ""))
                hits.append({
                    "title": hit.get("title"),
                    "url": hit.get("url"),
                    "price": hit.get("price"),
                    "available": hit.get("available", True),
                    "provider": "libreria_nacional",
                    "relevance": relevance,
                    "image_url": hit.get("image_url"),  # Agregar imagen
                })
            return "libreria_nacional", hits, None
        else:
            return "libreria_nacional", [], result.get("error", "unknown")
    except Exception as e:
        return "libreria_nacional", [], str(e)


def _quote_jamila(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta búsqueda en Jamila. Retorna (provider, hits, error)."""
    try:
        result = quote_jamila(query, limit=limit)
        if result["status"] in ("ok", "not_found"):
            hits = []
            for hit in result.get("hits", []):
                relevance = _token_overlap(query, hit.get("title", ""))
                hits.append({
                    "title": hit.get("title"),
                    "url": hit.get("url"),
                    "price": hit.get("price"),
                    "available": hit.get("available", True),
                    "provider": "jamila",
                    "relevance": relevance,
                    "image_url": hit.get("image_url"),
                })
            return "jamila", hits, None
        else:
            return "jamila", [], result.get("error", "unknown")
    except Exception as e:
        return "jamila", [], str(e)


def _quote_coloranimal(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta búsqueda en Coloranimal. Retorna (provider, hits, error)."""
    try:
        result = quote_coloranimal(query, limit=limit)
        if result["status"] in ("ok", "not_found"):
            hits = []
            for hit in result.get("hits", []):
                relevance = _token_overlap(query, hit.get("title", ""))
                hits.append({
                    "title": hit.get("title"),
                    "url": hit.get("url"),
                    "price": hit.get("price"),
                    "available": hit.get("available", True),
                    "provider": "coloranimal",
                    "relevance": relevance,
                    "image_url": hit.get("image_url"),
                })
            return "coloranimal", hits, None
        else:
            return "coloranimal", [], result.get("error", "unknown")
    except Exception as e:
        return "coloranimal", [], str(e)


def _quote_pronobel(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta búsqueda en Pronobel. Retorna (provider, hits, error)."""
    try:
        result = quote_pronobel(query, limit=limit)
        if result["status"] in ("ok", "not_found"):
            hits = []
            for hit in result.get("hits", []):
                relevance = _token_overlap(query, hit.get("title", ""))
                hits.append({
                    "title": hit.get("title"),
                    "url": hit.get("url"),
                    "price": hit.get("price"),
                    "available": hit.get("available", True),
                    "provider": "pronobel",
                    "relevance": relevance,
                    "image_url": hit.get("image_url"),
                })
            return "pronobel", hits, None
        else:
            return "pronobel", [], result.get("error", "unknown")
    except Exception as e:
        return "pronobel", [], str(e)


def _quote_prisa(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta búsqueda en Prisa. Retorna (provider, hits, error)."""
    try:
        result = quote_prisa(query, limit=limit)
        if result["status"] in ("ok", "not_found"):
            hits = []
            for hit in result.get("hits", []):
                relevance = _token_overlap(query, hit.get("title", ""))
                hits.append({
                    "title": hit.get("title"),
                    "url": hit.get("url"),
                    "price": hit.get("price"),
                    "available": hit.get("available", True),
                    "provider": "prisa",
                    "relevance": relevance,
                    "image_url": hit.get("image_url"),
                })
            return "prisa", hits, None
        else:
            return "prisa", [], result.get("error", "unknown")
    except Exception as e:
        return "prisa", [], str(e)


def _quote_lasecretaria(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta búsqueda en Lasecretaria. Retorna (provider, hits, error)."""
    try:
        result = quote_lasecretaria(query, limit=limit)
        if result["status"] in ("ok", "not_found"):
            hits = []
            for hit in result.get("hits", []):
                relevance = _token_overlap(query, hit.get("title", ""))
                hits.append({
                    "title": hit.get("title"),
                    "url": hit.get("url"),
                    "price": hit.get("price"),
                    "available": hit.get("available", True),
                    "provider": "lasecretaria",
                    "relevance": relevance,
                    "image_url": hit.get("image_url"),
                })
            return "lasecretaria", hits, None
        else:
            return "lasecretaria", [], result.get("error", "unknown")
    except Exception as e:
        return "lasecretaria", [], str(e)


def quote_multi_providers(
    query: str,
    providers: List[str] = None,
    limit_per_provider: int = 5,
    max_results: int = 10,
) -> Dict[str, Any]:
    """
    Busca un producto en múltiples proveedores EN PARALELO (más rápido).

    Args:
        query: Término de búsqueda.
        providers: Lista de proveedores a usar. 
                   Opciones: "dimeiggs", "jumbo", "lider", "lapiz_lopez", "libreria_nacional",
                             "jamila", "coloranimal", "pronobel", "prisa", "lasecretaria"
                   Si None, usa todos los funcionales.
        limit_per_provider: Máximo de resultados por proveedor.
        max_results: Máximo de resultados consolidados a devolver.

    Returns:
        Dict con estructura:
        {
            "query": str,
            "status": "ok" | "partial" | "error",
            "providers_queried": [str],
            "providers_failed": [str],
            "hits": [
                {
                    "title": str,
                    "url": str,
                    "price": int | None,
                    "available": bool,
                    "provider": str,
                    "relevance": float  # 0.0 a 1.0
                },
                ...
            ],
            "error": str | None,
        }
    """
    if providers is None:
        # Todos los proveedores funcionales
        providers = ["dimeiggs", "libreria_nacional", "jamila", "coloranimal", "pronobel", "prisa", "lasecretaria"]

    providers = [p.lower() for p in providers]
    all_hits: List[Dict[str, Any]] = []
    providers_failed = []
    providers_queried = list(providers)

    # Mapeo de proveedores a funciones
    provider_funcs = {
        "dimeiggs": lambda: _quote_dimeiggs(query, limit_per_provider),
        "jumbo": lambda: _quote_jumbo(query, limit_per_provider),
        "lider": lambda: _quote_lider(query, limit_per_provider),
        "lapiz_lopez": lambda: _quote_lapiz_lopez(query, limit_per_provider),
        "libreria_nacional": lambda: _quote_libreria_nacional(query, limit_per_provider),
        "jamila": lambda: _quote_jamila(query, limit_per_provider),
        "coloranimal": lambda: _quote_coloranimal(query, limit_per_provider),
        "pronobel": lambda: _quote_pronobel(query, limit_per_provider),
        "prisa": lambda: _quote_prisa(query, limit_per_provider),
        "lasecretaria": lambda: _quote_lasecretaria(query, limit_per_provider),
    }

    # Ejecuta búsquedas EN PARALELO usando ThreadPoolExecutor
    # Usar max_workers = número de proveedores para máximo paralelismo
    max_workers = min(len(providers), 10)  # Máx 10 threads para evitar overhead
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit todas las tareas
        futures = {}
        for provider in providers:
            if provider in provider_funcs:
                futures[provider] = executor.submit(provider_funcs[provider])

        # Recolecta resultados a medida que terminan (as_completed = más rápido)
        for future in as_completed(futures.values()):
            try:
                prov_name, hits, error = future.result(timeout=15)  # Timeout más agresivo
                if error:
                    providers_failed.append((prov_name, error))
                else:
                    all_hits.extend(hits)
            except Exception as e:
                # Encontrar qué proveedor fue
                for prov, fut in futures.items():
                    if fut is future:
                        providers_failed.append((prov, str(e)))
                        break

    # Ordena por: relevancia (descendente) y precio (ascendente)
    # Prioriza coincidencia > precio
    all_hits.sort(
        key=lambda x: (
            -x.get("relevance", 0),  # relevancia descendente
            x.get("price") or float("inf"),  # precio ascendente (nulos al final)
        )
    )

    # Limita resultados
    all_hits = all_hits[:max_results]

    # Determina status
    if len(all_hits) == 0 and len(providers_failed) == len(providers):
        status = "error"
    elif len(all_hits) == 0:
        status = "no_results"
    elif len(providers_failed) > 0:
        status = "partial"
    else:
        status = "ok"

    return {
        "query": query,
        "status": status,
        "providers_queried": providers_queried,
        "providers_failed": providers_failed,
        "hits": all_hits,
        "error": None if status != "error" else "Todos los proveedores fallaron",
    }
