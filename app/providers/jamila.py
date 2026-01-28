"""
Jamila.cl - Tienda online especializada en artículos de oficina y escolares.
Cliente para búsqueda de productos.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Set
import requests
from bs4 import BeautifulSoup
import json
import re
import unicodedata


# Títulos que NO son productos reales
BLACKLIST_TITLE_PARTS: Set[str] = {
    "adorno", "cotillon", "cumpleaños", "fiesta", "disfraz",
    "sabanilla", "pañal", "toalla", "servilleta",
    "bolsa", "caja", "frasco", "tarro",
}


def _normalize_text(text: str) -> str:
    """Normaliza texto: elimina acentos y convierte a minúsculas."""
    # Descomponer acentos
    nfd = unicodedata.normalize('NFD', text)
    # Remover marcas diacríticas
    without_accents = ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')
    return without_accents.lower()


def _tokens(text: str) -> set:
    """Extrae tokens significativos de un texto (palabras >2 chars)."""
    text = _normalize_text(text)
    # Remover caracteres especiales, mantener solo alfanuméricos
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    words = text.split()
    # Retornar solo palabras con >2 caracteres
    return {w for w in words if len(w) > 2}


def _overlap_ratio(query: str, title: str) -> float:
    """Calcula el ratio de solapamiento entre query y title basado en tokens."""
    qtok = _tokens(query)
    ttok = _tokens(title)
    if not qtok:
        return 1.0  # Si query está vacía, aceptar
    overlap = len(qtok & ttok)
    return overlap / len(qtok)


def _is_bad_title(title: str) -> bool:
    """Verifica si el título corresponde a algo que no es un producto."""
    title_lower = _normalize_text(title)
    return any(bad in title_lower for bad in BLACKLIST_TITLE_PARTS)


class JamilaClient:
    """
    Busca productos en Jamila.cl - tienda de artículos escolares y de oficina.
    """

    def __init__(self, timeout: int = 15):
        self.base_url = "https://www.jamila.cl"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca productos en Jamila.cl con filtros de relevancia
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
        """Extrae productos de resultados de búsqueda con filtros de relevancia."""
        soup = BeautifulSoup(html, "html.parser")
        hits = []
        seen_urls = set()
        
        # Buscar específicamente contenedores de productos con clase "productos-mod"
        containers = soup.find_all("div", class_="productos-mod", limit=limit * 3)
        
        for container in containers:
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
                
                # Evitar duplicados
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                
                # Extraer título - buscar h2 dentro del contenedor
                title_elem = container.find("h2")
                if not title_elem:
                    title_elem = link
                title = title_elem.get_text(strip=True) if title_elem else ""
                
                if not title or len(title) < 3:
                    continue
                
                # FILTRO 1: Rechazar títulos en blacklist
                if _is_bad_title(title):
                    continue
                
                # FILTRO 2: Rechazar si no hay suficiente solapamiento con query (min 30%)
                if _overlap_ratio(query, title) < 0.3:
                    continue
                
                # FILTRO 3: Validar URL - debe contener /producto-detalle/
                if "/producto-detalle/" not in href:
                    continue
                
                # Extraer precio
                price = self._extract_price(container)
                
                # FILTRO 4: Requerir evidencia de producto (precio o imagen)
                img = container.find("img", src=True)
                image_url = ""
                if img:
                    image_url = img.get("src", "")
                    if image_url and not image_url.startswith("http"):
                        image_url = self.base_url + (image_url if image_url.startswith("/") else "/" + image_url)
                
                if not price and not image_url:
                    continue
                
                hits.append({
                    "title": title,
                    "url": href,
                    "price": price,
                    "image_url": image_url,
                    "available": True,
                    "provider": "jamila",
                })
                
            except Exception:
                pass
        
        return hits

    def _extract_price(self, element) -> Optional[int]:
        """Extrae precio de un elemento."""
        try:
            # Buscar div con clase "precio-oferta"
            precio_oferta = element.find("div", class_="precio-oferta")
            if precio_oferta:
                # Buscar h4 dentro del div precio-oferta
                h4 = precio_oferta.find("h4")
                if h4:
                    text = h4.get_text(strip=True)
                    # Buscar números con formato de precio (ej: $5.260)
                    import re
                    numbers = re.findall(r'\d+(?:[.,]\d+)*', text)
                    if numbers:
                        # Tomar el primer número (precio con oferta)
                        try:
                            price_str = numbers[0].replace(".", "").replace(",", "")
                            return int(float(price_str))
                        except (ValueError, TypeError):
                            pass
            
            # Fallback: Buscar elementos con precio genéricos
            for price_elem in element.find_all(["span", "div", "p"], class_=lambda x: x and any(c in (x or "").lower() for c in ["price", "precio", "valor"])):
                text = price_elem.get_text(strip=True)
                # Buscar números con formato de precio
                import re
                numbers = re.findall(r'\d+(?:[.,]\d+)*', text)
                if numbers:
                    # Tomar el número más grande (usualmente el precio)
                    try:
                        price_str = numbers[-1].replace(".", "").replace(",", "")
                        return int(float(price_str))
                    except (ValueError, TypeError):
                        continue
            
            return None
        except Exception:
            return None
