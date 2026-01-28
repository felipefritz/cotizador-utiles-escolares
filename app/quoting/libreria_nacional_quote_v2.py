"""
Quoting module for Librería Nacional (nacional.cl).
Tienda especializada en libros, útiles escolares y artículos educativos.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
import requests
from bs4 import BeautifulSoup
import re
import unicodedata


BLACKLIST_TITLE_PARTS = {
    "ver más", "ver mas", "ver todo", "ver productos", "ver", "más", "mas",
    "categorías", "categorias", "inicio", "home", "carrito", "mi cuenta",
    "iniciar sesión", "iniciar sesion", "registrarse", "registro",
    "contacto", "ayuda", "términos", "terminos", "política", "politica",
    "blog", "novedades", "ofertas", "promociones", "newsletter", "suscríbete",
    "suscribete", "facebook", "instagram", "twitter", "youtube", "tiktok",
}


def _normalize_text(s: str) -> str:
    s = s.lower().strip()
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _tokens(s: str) -> set[str]:
    return {w for w in _normalize_text(s).split() if len(w) > 2}


def _overlap_ratio(query: str, title: str) -> float:
    qtok = _tokens(query)
    ttok = _tokens(title)
    if not qtok:
        return 1.0
    overlap = len(qtok & ttok)
    return overlap / max(1, len(qtok))


def _has_query_overlap(query: str, title: str, min_ratio: float = 0.5) -> bool:
    return _overlap_ratio(query, title) >= min_ratio


def _is_product_url(url: str) -> bool:
    if not url:
        return False
    u = url.lower()
    if any(x in u for x in [
        "mailto:", "javascript:", "#",
        "/cart", "/carrito", "/account", "/login",
        "/pages/", "/page/", "/collections/", "/collection/", "/search",
        "/category", "/categoria", "/blog", "/news", "/contact", "/about",
        "/faq", "/terms", "/policy", "/policies",
        "facebook.com", "instagram.com", "twitter.com", "youtube.com", "tiktok.com",
    ]):
        return False
    return any(x in u for x in ["/product/", "/products/", "/producto/", "/productos/", "/item/", "/items/"])


def _is_bad_title(title: str) -> bool:
    t = " ".join(title.lower().split())
    if not t or len(t) < 3:
        return True
    return any(x in t for x in BLACKLIST_TITLE_PARTS)


class LibreriaNacionalClient:
    """
    Busca productos en Librería Nacional (nacional.cl).
    Tienda chilena especializada en útiles escolares y libros.
    """

    def __init__(self, timeout: int = 15):
        self.base_url = "https://nacional.cl"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca productos en Librería Nacional.
        """
        query = (query or "").strip()
        if not query:
            return []

        try:
            # Intenta búsqueda normal
            search_url = f"{self.base_url}/search"
            params = {"q": query}
            r = self.session.get(search_url, params=params, timeout=self.timeout)
            r.raise_for_status()
            
            hits = self._parse_results(r.text, query, limit)
            if hits:
                return hits
            
            # Si no encuentra nada, intenta en colecciones relevantes
            for collection in ["escolar", "papeleria"]:
                try:
                    url = f"{self.base_url}/collections/{collection}?q={query}"
                    r = self.session.get(url, timeout=self.timeout)
                    r.raise_for_status()
                    
                    hits = self._parse_collection(r.text, query, limit)
                    if hits:
                        return hits
                except:
                    pass
            
            return []
            
        except Exception as e:
            return []

    def _parse_results(self, html: str, query: str, limit: int) -> List[Dict[str, Any]]:
        """Extrae productos de resultados de búsqueda."""
        soup = BeautifulSoup(html, "html.parser")
        hits = []
        seen_urls = set()
        
        # Shopify: productos en tarjetas (.card-wrapper / .product-card-wrapper)
        cards = soup.select(".card-wrapper, .product-card-wrapper, .card")
        for card in cards:
            if len(hits) >= limit:
                break
            
            try:
                a = card.find("a", href=lambda x: x and "/products/" in x)
                if not a:
                    continue

                href = a.get("href", "").strip()
                text = a.get_text(" ", strip=True)
                
                # Validaciones básicas
                if not href or not text or len(text) < 3 or len(text) > 200:
                    continue
                
                # Hacer URL absoluta
                if not href.startswith("http"):
                    href = self.base_url + (href if href.startswith("/") else "/" + href)
                
                # Filtrar no-productos
                url_lower = href.lower()
                if any(x in url_lower for x in ["pages", "blog", "login", "cart", "/collections/", "policy", "terms", "#"]):
                    continue

                # Validar URL de producto
                if not _is_product_url(href):
                    continue
                
                # Evitar duplicados
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                
                text = " ".join(text.split())
                if _is_bad_title(text):
                    continue

                if not _has_query_overlap(query, text):
                    continue

                # Extraer precio del contenedor
                price = None
                price = self._extract_price(card) or self._extract_price(a)
                
                # Extraer imagen
                image_url = ""
                img = card.find("img", src=True) or a.find("img", src=True)
                if img:
                    image_url = img.get("src", "")
                    if image_url and not image_url.startswith("http"):
                        image_url = self.base_url + (image_url if image_url.startswith("/") else "/" + image_url)
                
                # Requiere evidencia de producto (precio o imagen)
                if price is None and not image_url:
                    continue
                
                hits.append({
                    "title": text,
                    "url": href,
                    "price": price,
                    "image_url": image_url,
                    "available": True,
                    "provider": "libreria_nacional",
                })
                
            except Exception:
                pass
        
        return hits

    def _parse_collection(self, html: str, search_term: str, limit: int) -> List[Dict[str, Any]]:
        """Extrae productos de colección, filtrando por término."""
        soup = BeautifulSoup(html, "html.parser")
        hits = []
        seen_urls = set()
        search_lower = search_term.lower()
        
        cards = soup.select(".card-wrapper, .product-card-wrapper, .card")
        for card in cards:
            if len(hits) >= limit:
                break
            
            try:
                a = card.find("a", href=lambda x: x and "/products/" in x)
                if not a:
                    continue

                text = a.get_text(" ", strip=True)
                
                # Solo si el título contiene el término de búsqueda
                if search_lower not in text.lower():
                    continue
                
                href = a.get("href", "").strip()
                if not href or not text or len(text) < 3:
                    continue
                
                if not href.startswith("http"):
                    href = self.base_url + (href if href.startswith("/") else "/" + href)

                # Validar URL de producto
                if not _is_product_url(href):
                    continue
                
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                
                text = " ".join(text.split())
                if _is_bad_title(text):
                    continue

                if not _has_query_overlap(search_term, text):
                    continue

                # Extraer precio
                price = None
                price = self._extract_price(card) or self._extract_price(a)
                
                # Imagen
                image_url = ""
                img = card.find("img", src=True) or a.find("img", src=True)
                if img:
                    image_url = img.get("src", "")
                    if image_url and not image_url.startswith("http"):
                        image_url = self.base_url + (image_url if image_url.startswith("/") else "/" + image_url)
                
                # Requiere evidencia de producto (precio o imagen)
                if price is None and not image_url:
                    continue
                
                hits.append({
                    "title": text,
                    "url": href,
                    "price": price,
                    "image_url": image_url,
                    "available": True,
                    "provider": "libreria_nacional",
                })
                
            except Exception:
                pass
        
        return hits

    def _extract_price(self, elem) -> Optional[int]:
        """Extrae precio en CLP desde un elemento."""
        if not elem:
            return None

        text = elem.get_text()

        # Patrón: $ seguido de números
        match = re.search(r"\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)", text)
        if match:
            price_str = match.group(1).replace(".", "").replace(",", "")
            try:
                price = int(price_str)
                if 100 <= price <= 10000000:
                    return price
            except:
                pass

        # Patrón: números grandes sin $
        match = re.search(r"\b(\d{3,7})\b", text)
        if match:
            try:
                price = int(match.group(1))
                if 100 <= price <= 10000000:
                    return price
            except:
                pass

        return None


def quote_libreria_nacional(query: str, limit: int = 5) -> Dict[str, Any]:
    """
    Busca productos en Librería Nacional.
    """
    cli = LibreriaNacionalClient(timeout=15)
    try:
        hits = cli.search(query, limit=limit)
        return {
            "query": query,
            "provider": "libreria_nacional",
            "status": "ok" if hits else "not_found",
            "hits": hits,
            "error": None,
        }
    except Exception as e:
        return {
            "query": query,
            "provider": "libreria_nacional",
            "status": "error",
            "hits": [],
            "error": str(e),
        }
