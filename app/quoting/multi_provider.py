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
from app.quoting.prisa_quote import quote_prisa
from app.quoting.lasecretaria_quote import quote_lasecretaria
from app.quoting.mercadolibre_quote import quote_mercadolibre
from app.quoting.provider_registry import available_providers
from app.providers.structured_stores import SHOPIFY_STORES, STRUCTURED_PROVIDERS
from app.quoting.structured_store_quote import quote_structured_store
from app.quoting import relevance as rel
import threading
import time
from concurrent.futures import ThreadPoolExecutor, wait


STOPWORDS = rel.STOPWORDS

#: Presupuesto total de una búsqueda multi-fuente. Una tienda lenta no debe
#: retener la respuesta del resto: lo que no llegue a tiempo se informa como
#: fuente fallida por timeout.
SEARCH_DEADLINE_SECONDS = 25

#: Caché corto de (fuente, consulta). Las listas repiten mucho las mismas
#: consultas y Shopify limita por IP; SOURCES.md lo dejaba como pendiente.
CACHE_TTL_SECONDS = 600
CACHE_MAX_ENTRIES = 5000
_cache: Dict[Tuple[str, str, int], Tuple[float, List[Dict[str, Any]]]] = {}
_cache_lock = threading.Lock()


def _cache_get(key: Tuple[str, str, int]) -> Optional[List[Dict[str, Any]]]:
    with _cache_lock:
        entry = _cache.get(key)
        if not entry:
            return None
        stored_at, hits = entry
        if time.monotonic() - stored_at > CACHE_TTL_SECONDS:
            _cache.pop(key, None)
            return None
        return [dict(hit) for hit in hits]


def _cache_put(key: Tuple[str, str, int], hits: List[Dict[str, Any]]) -> None:
    with _cache_lock:
        if len(_cache) >= CACHE_MAX_ENTRIES:
            # Se descarta la mitad más antigua; no hace falta un LRU exacto.
            for old_key, _ in sorted(_cache.items(), key=lambda item: item[1][0])[: CACHE_MAX_ENTRIES // 2]:
                _cache.pop(old_key, None)
        _cache[key] = (time.monotonic(), [dict(hit) for hit in hits])


def clear_cache() -> None:
    with _cache_lock:
        _cache.clear()


def _normalize_text(s: str) -> str:
    """Normaliza texto para búsqueda: minúsculas, sin acentos, espacios limpios."""
    return rel.normalize_text(s)


def _canonical_token(word: str) -> str:
    """Raíz simétrica de singular y plural (ver `app.quoting.relevance`)."""
    return rel.canonical_token(word)


def _relevant_tokens(normalized: str) -> set[str]:
    """Tokens que sí discriminan entre productos (cifras incluidas)."""
    return set(rel.tokenize(normalized)[0])


def _token_overlap(query: str, title: str, min_ratio: float = 0.5) -> float:
    """Coincidencia ponderada entre 0.0 y 1.0 (ver `app.quoting.relevance`)."""
    return rel.token_overlap(query, title)


def _is_relevant_hit(query: str, title: str, min_ratio: float = rel.MIN_RELEVANCE) -> bool:
    """Exige evidencia textual mínima antes de mostrar un producto."""
    return rel.is_relevant(query, title, min_ratio)


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
                "price": hit.get("price"),
                "available": hit.get("available") is not False,
                "provider": "dimeiggs",
                "relevance": relevance,
                "sku": hit.get("sku"),
                "image_url": hit.get("image_url"),  # Agregar imagen
            })
        
        return "dimeiggs", hits, None
    
    except Exception as e:
        return "dimeiggs", [], str(e)


def _quote_mercadolibre(query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta búsqueda en MercadoLibre Chile usando su API pública."""
    try:
        result = quote_mercadolibre(query, limit=limit)
        if result["status"] in ("ok", "not_found"):
            hits = []
            for hit in result.get("hits", []):
                relevance = _token_overlap(query, hit.get("title", ""))
                hits.append({
                    "title": hit.get("title"),
                    "url": hit.get("url"),
                    "price": hit.get("price"),
                    "available": hit.get("available", True),
                    "provider": "mercadolibre",
                    "merchant": hit.get("merchant"),
                    "relevance": relevance,
                    "sku": hit.get("sku"),
                    "image_url": hit.get("image_url"),
                    "condition": hit.get("condition"),
                })
            return "mercadolibre", hits, None
        return "mercadolibre", [], result.get("error", "unknown")
    except Exception as e:
        return "mercadolibre", [], str(e)


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


def _quote_structured_store(provider: str, query: str, limit: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Ejecuta una tienda con búsqueda pública validada."""
    result = quote_structured_store(provider, query, limit=limit)
    if result["status"] in ("ok", "not_found"):
        hits = []
        for hit in result.get("hits", []):
            normalized = dict(hit)
            normalized["relevance"] = _token_overlap(query, hit.get("title", ""))
            hits.append(normalized)
        return provider, hits, None
    return provider, [], result.get("error", "unknown")


def _provider_search(provider: str, limit_per_provider: int):
    """Callable `consulta -> (proveedor, hits, error)` para un proveedor."""
    custom = {
        "mercadolibre": _quote_mercadolibre,
        "dimeiggs": _quote_dimeiggs,
        "lapiz_lopez": _quote_lapiz_lopez,
        "libreria_nacional": _quote_libreria_nacional,
        "jamila": _quote_jamila,
        "coloranimal": _quote_coloranimal,
        "prisa": _quote_prisa,
        "lasecretaria": _quote_lasecretaria,
    }
    if provider in custom:
        return lambda q: custom[provider](q, limit_per_provider)
    if provider in STRUCTURED_PROVIDERS:
        return lambda q: _quote_structured_store(provider, q, limit_per_provider)
    return None


def build_provider_funcs(query: str, limit_per_provider: int) -> Dict[str, Any]:
    """Mapa `proveedor -> callable` que resuelve una búsqueda para ese proveedor.

    Es la nómina completa de lo que el orquestador sabe consultar. Un id que no
    aparezca acá se ignora silenciosamente en `quote_multi_providers`, así que
    `tests/test_provider_registry.py` verifica que cubra todo `CORE_PROVIDERS`.
    """
    provider_funcs: Dict[str, Any] = {}
    for provider in [
        "mercadolibre", "dimeiggs", "lapiz_lopez", "libreria_nacional", "jamila",
        "coloranimal", "prisa", "lasecretaria", *STRUCTURED_PROVIDERS,
    ]:
        search = _provider_search(provider, limit_per_provider)
        if search is not None:
            provider_funcs[provider] = (lambda s=search: s(query))
    return provider_funcs


def _score_hits(query: str, hits: List[Dict[str, Any]], searched_as: Optional[str] = None) -> List[Dict[str, Any]]:
    scored: List[Dict[str, Any]] = []
    for hit in hits:
        normalized = dict(hit)
        result = rel.score(query, str(hit.get("title") or ""))
        normalized["relevance"] = result["relevance"]
        normalized["head"] = result["head"]
        if searched_as:
            normalized["searched_as"] = searched_as
            if result["core_coverage"] < rel.FALLBACK_MIN_COVERAGE:
                # Coincidencia parcial obtenida por una consulta más amplia
                # que la del usuario: no alcanza para mostrarla.
                normalized["relevance"] = min(result["relevance"], rel.MIN_RELEVANCE - 0.01)
        scored.append(normalized)
    return scored


def _search_provider(provider: str, query: str, limit_per_provider: int) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """Busca en una fuente, con caché y consultas de respaldo.

    Si la consulta completa no deja ningún resultado relevante (típico de
    WooCommerce con cifras o plurales: "cuaderno universitario 100 hojas",
    "estuches"), se reintenta con versiones más simples. La relevancia se
    sigue midiendo contra la consulta original del usuario.
    """
    search = _provider_search(provider, limit_per_provider)
    if search is None:
        return provider, [], "Proveedor desconocido"

    def run(q: str) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        key = (provider, rel.normalize_text(q), limit_per_provider)
        cached = _cache_get(key)
        if cached is not None:
            return cached, None
        _, found, error = search(q)
        if not error:
            _cache_put(key, found)
        return found, error

    hits, error = run(query)
    if error:
        return provider, [], error
    scored = _score_hits(query, hits)
    if any(hit["relevance"] >= rel.MIN_RELEVANCE for hit in scored):
        return provider, scored, None
    if provider in SHOPIFY_STORES:
        # El Predictive Search de Shopify ya tolera cifras y plurales, y limita
        # por IP compartida entre ~24 tiendas: reintentar solo suma 429.
        return provider, scored, None

    for fallback in rel.simplified_queries(query):
        more, fallback_error = run(fallback)
        if fallback_error:
            break
        extra = _score_hits(query, more, searched_as=fallback)
        if any(hit["relevance"] >= rel.MIN_RELEVANCE for hit in extra):
            return provider, scored + extra, None
    return provider, scored, None


def quote_multi_providers(
    query: str,
    providers: List[str] = None,
    limit_per_provider: int = 5,
    max_results: int = 10,
) -> Dict[str, Any]:
    """
    Busca un producto en múltiples proveedores EN PARALELO.

    Args:
        query: Término de búsqueda.
        providers: Lista de proveedores a usar.
                   Opciones publicadas por provider_registry.available_providers().
                   Si None, usa todos los funcionales/configurados.
        limit_per_provider: Máximo de resultados por proveedor.
        max_results: Máximo de resultados consolidados a devolver.

    Returns:
        Dict con estructura:
        {
            "query": str,
            "status": "ok" | "partial" | "no_results" | "error",
            "providers_queried": [str],
            "providers_failed": [[str, str]],
            "hits": [
                {
                    "title": str,
                    "url": str,
                    "price": int | None,
                    "available": bool,
                    "provider": str,
                    "relevance": float,  # 0.0 a 1.0
                    "head": float,       # 1.0 si el núcleo del título coincide
                },
                ...
            ],
            "error": str | None,
        }

    Orden de los hits: disponibles primero, luego relevancia, precio y, en
    empate, que el título empiece por el producto buscado. Así `hits[0]` es el
    producto que conviene mostrar como mejor opción y nunca uno agotado
    habiendo alternativas con stock.
    """
    if providers is None:
        providers = available_providers()

    providers = list(dict.fromkeys(p.lower() for p in providers))
    if not providers:
        return {
            "query": query,
            "status": "error",
            "providers_queried": [],
            "providers_failed": [],
            "hits": [],
            "error": "No se seleccionaron proveedores",
        }
    all_hits: List[Dict[str, Any]] = []
    providers_failed: List[Tuple[str, str]] = []
    providers_queried = list(providers)

    known = [provider for provider in providers if _provider_search(provider, limit_per_provider) is not None]
    for provider in providers:
        if provider not in known:
            providers_failed.append((provider, "Proveedor desconocido"))

    if known:
        executor = ThreadPoolExecutor(max_workers=min(len(known), 32))
        futures = {
            executor.submit(_search_provider, provider, query, limit_per_provider): provider
            for provider in known
        }
        done, pending = wait(futures, timeout=SEARCH_DEADLINE_SECONDS)
        for future in done:
            provider = futures[future]
            try:
                _, hits, error = future.result()
            except Exception as exc:  # pragma: no cover - defensivo
                providers_failed.append((provider, str(exc)))
                continue
            if error:
                providers_failed.append((provider, error))
            else:
                all_hits.extend(hits)
        for future in pending:
            providers_failed.append((futures[future], f"Sin respuesta en {SEARCH_DEADLINE_SECONDS} s"))
        # No se espera a las tiendas colgadas: su resultado ya no se usaría.
        executor.shutdown(wait=False, cancel_futures=True)

    # Algunas búsquedas internas devuelven productos promocionados o de relleno
    # aunque no coincidan con la consulta. Esos resultados no deben llegar al
    # frontend por baratos que sean.
    all_hits = [hit for hit in all_hits if float(hit.get("relevance") or 0) >= rel.MIN_RELEVANCE]

    # Una misma URL puede llegar dos veces (consulta completa y de respaldo).
    unique: Dict[str, Dict[str, Any]] = {}
    for hit in all_hits:
        key = str(hit.get("url") or "") or f"{hit.get('provider')}::{hit.get('title')}"
        current = unique.get(key)
        if current is None or rel.rank_key(hit) < rel.rank_key(current):
            unique[key] = hit
    all_hits = rel.best_hits(list(unique.values()))[:max_results]

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
