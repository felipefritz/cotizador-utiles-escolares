"""
Pronobel.cl - Tienda online de útiles escolares y artículos de papelería.
Cliente para búsqueda de productos.
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


class PronobelClient:
    """
    Busca productos en Pronobel.cl - tienda de útiles escolares.
    """

    def __init__(self, timeout: int = 15):
        self.base_url = "https://www.pronobel.cl"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca productos en Pronobel.cl
        """
        query = (query or "").strip()
        if not query:
            return []

        try:
            # Intenta búsqueda en el sitio
            search_url = f"{self.base_url}/search?q={query}"
            r = self.session.get(search_url, timeout=self.timeout)
            r.raise_for_status()
            
            hits = self._parse_results(r.text, query, limit)
            return hits
            
        except Exception as e:
            return []

    def _parse_results(self, html: str, query: str, limit: int) -> List[Dict[str, Any]]:
        """Extrae productos de resultados de búsqueda."""
        soup = BeautifulSoup(html, "html.parser")
        hits = []
        seen_urls = set()
        
        # Buscar contenedores de productos
        for container in soup.find_all(["div", "article"], class_=lambda x: x and any(c in (x or "").lower() for c in ["product", "item", "result", "article", "card"])):
            if len(hits) >= limit:
                break
            
            try:
                # Buscar enlace al producto
                link = container.find("a", href=True)
                if not link:
                    continue
                
                href = link.get("href", "").strip()
                if not href:
                    continue
                
                # Hacer URL absoluta
                if not href.startswith("http"):
                    href = self.base_url + (href if href.startswith("/") else "/" + href)

                # Validar URL de producto
                if not _is_product_url(href):
                    continue
                
                # Evitar duplicados
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                
                # Extraer título
                title_elem = container.find(["h2", "h3", "span"], class_=lambda x: x and any(c in (x or "").lower() for c in ["title", "name", "producto"]))
                if not title_elem:
                    title_elem = link
                title = title_elem.get_text(strip=True) if title_elem else ""
                
                if not title or len(title) < 3:
                    continue

                title = " ".join(title.split())
                if _is_bad_title(title):
                    continue

                if not _has_query_overlap(query, title):
                    continue
                
                # Extraer precio
                price = self._extract_price(container)
                
                # Extraer imagen
                img = container.find("img", src=True)
                image_url = ""
                if img:
                    image_url = img.get("src", "")
                    if image_url and not image_url.startswith("http"):
                        image_url = self.base_url + (image_url if image_url.startswith("/") else "/" + image_url)
                
                # Requiere evidencia de producto (precio o imagen)
                if price is None and not image_url:
                    continue

                hits.append({
                    "title": title,
                    "url": href,
                    "price": price,
                    "image_url": image_url,
                    "available": True,
                    "provider": "pronobel",
                })
                
            except Exception:
                pass
        
        return hits

    def _extract_price(self, element) -> Optional[int]:
        """Extrae precio de un elemento."""
        try:
            # Buscar elementos con precio
            for price_elem in element.find_all(["span", "div", "p"], class_=lambda x: x and any(c in (x or "").lower() for c in ["price", "precio", "valor"])):
                text = price_elem.get_text(strip=True)
                # Buscar números con formato de precio
                import re
                numbers = re.findall(r'\d+(?:[.,]\d+)*', text)
                if numbers:
                    try:
                        price_str = numbers[-1].replace(".", "").replace(",", "")
                        return int(float(price_str))
                    except (ValueError, TypeError):
                        continue
            
            return None
        except Exception:
            return None
