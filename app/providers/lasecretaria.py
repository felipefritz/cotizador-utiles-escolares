"""
Lasecretaria.cl - Tienda online de útiles escolares y artículos de papelería.
Cliente para búsqueda de productos.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
import requests
from bs4 import BeautifulSoup


class LasecretariaClient:
    """
    Busca productos en Lasecretaria.cl - tienda de útiles escolares.
    """

    def __init__(self, timeout: int = 15):
        self.base_url = "https://www.lasecretaria.cl"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca productos en Lasecretaria.cl usando búsqueda PrestaShop
        """
        query = (query or "").strip()
        if not query:
            return []

        try:
            # URL de búsqueda correcta para PrestaShop
            search_url = f"{self.base_url}/busqueda?controller=search&orderby=position&orderway=desc&search_category=all&s={query}&submit_search="
            r = self.session.get(search_url, timeout=self.timeout)
            r.raise_for_status()
            
            hits = self._parse_results(r.text, limit)
            return hits
            
        except Exception as e:
            return []

    def _parse_results(self, html: str, limit: int) -> List[Dict[str, Any]]:
        """Extrae productos de resultados de búsqueda."""
        soup = BeautifulSoup(html, "html.parser")
        hits = []
        seen_urls = set()
        
        # PrestaShop: Buscar articles.productcontainer
        articles = soup.find_all("article", class_="productcontainer")
        
        if not articles:
            # Fallback: buscar todas las articles
            articles = soup.find_all("article")
        
        for article in articles:
            if len(hits) >= limit:
                break
            
            try:
                # Buscar link
                link = article.find("a", href=True)
                
                if not link:
                    continue
                
                href = link.get("href", "").strip()
                if not href or href.startswith("javascript:"):
                    continue
                
                # Hacer URL absoluta
                if not href.startswith("http"):
                    href = self.base_url + (href if href.startswith("/") else "/" + href)
                
                # Evitar duplicados
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                
                # Extraer título - buscar en diferentes lugares
                title = ""
                
                # Intenta obtener del link directo
                title = link.get_text(strip=True)
                
                # Si está vacío, buscar en h2/h3 o en atributo title
                if not title or len(title) < 3:
                    title_elem = article.find(["h2", "h3", "h4"])
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                
                # Último recurso: obtener del atributo title del link
                if not title or len(title) < 3:
                    title = link.get("title", "")
                
                # Último intento: usar el href para extraer el nombre del producto
                if not title or len(title) < 3:
                    # Ej: /cuadernos-y-blocks/265-cuaderno-indice-1-2-oficio-96-hjs
                    parts = href.split("/")
                    if len(parts) > 1:
                        last_part = parts[-1]  # ej: 265-cuaderno-indice-1-2-oficio-96-hjs
                        # Sacar el número y usar el resto como título
                        title_parts = last_part.split("-", 1)
                        if len(title_parts) > 1:
                            title = title_parts[1].replace("-", " ").title()
                
                if not title or len(title) < 3:
                    continue
                
                # Extraer precio
                price = self._extract_price(article)
                
                # Extraer imagen
                img = article.find("img", src=True)
                image_url = ""
                if img:
                    image_url = img.get("src", "")
                    if image_url and not image_url.startswith("http"):
                        image_url = self.base_url + (image_url if image_url.startswith("/") else "/" + image_url)
                
                hits.append({
                    "title": title,
                    "url": href,
                    "price": price,
                    "image_url": image_url,
                    "available": True,
                    "provider": "lasecretaria",
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
