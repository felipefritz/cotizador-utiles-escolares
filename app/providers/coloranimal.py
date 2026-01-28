"""
Coloranimal.cl - Tienda online de artículos escolares y útiles.
Cliente para búsqueda de productos.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
import requests
from bs4 import BeautifulSoup


class ColoranimalClient:
    """
    Busca productos en Coloranimal.cl - tienda de artículos escolares.
    """

    def __init__(self, timeout: int = 15):
        self.base_url = "https://www.coloranimal.cl"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca productos en Coloranimal.cl usando búsqueda PrestaShop
        """
        query = (query or "").strip()
        if not query:
            return []

        try:
            # URL de búsqueda correcta para PrestaShop
            search_url = f"{self.base_url}/busqueda?controller=search&s={query}"
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
        
        # PrestaShop: Buscar articles individuales
        articles = soup.find_all("article")
        
        for article in articles:
            if len(hits) >= limit:
                break
            
            try:
                # Buscar link dentro del artículo (que apunte a producto)
                link = article.find("a", href=lambda x: x and "/products/" in (x or ""))
                
                if not link:
                    # Fallback: cualquier a href dentro
                    link = article.find("a", href=True)
                
                if not link:
                    continue
                
                href = link.get("href", "").strip()
                if not href or href.startswith("javascript:") or href == "#":
                    continue
                
                # Hacer URL absoluta
                if not href.startswith("http"):
                    href = self.base_url + (href if href.startswith("/") else "/" + href)
                
                # Evitar duplicados
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                
                # Extraer título
                title_elem = article.find(["h2", "h3"], class_=lambda x: x and "title" in (x or "").lower())
                if not title_elem:
                    title_elem = link
                
                title = title_elem.get_text(strip=True) if title_elem else ""
                
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
                    "provider": "coloranimal",
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
