"""
Quoting module for Lápiz López (WooCommerce).
Lápiz López es una tienda especializada en útiles escolares con sitio WooCommerce.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
import requests
from bs4 import BeautifulSoup
import re
import time
import asyncio

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class LapizLopezClient:
    """
    Busca productos en Lápiz López (lapizlopez.cl).
    Usa WooCommerce, por lo que la estructura es más predecible.
    """

    def __init__(self, timeout: int = 15):
        self.base_url = "https://lapizlopez.cl"
        self.timeout = timeout
        self.session = requests.Session()
        # Headers mejorados para evitar bloqueo por bot detection
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0",
            "DNT": "1",
        })

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca productos en Lápiz López.
        Estrategia: Playwright primero (mejor para sitios con protección), luego fallback.
        """
        query = (query or "").strip()
        if not query:
            return []

        # Estrategia 1: Usar Playwright para evadir protección
        if PLAYWRIGHT_AVAILABLE:
            try:
                hits = asyncio.run(self._search_playwright(query, limit))
                if hits:
                    return hits[:limit]
            except Exception as e:
                print(f"Playwright error en Lápiz López: {e}")
        
        # Estrategia 2: Búsqueda con requests + retry
        hits = self._search_with_requests(query, limit)
        if hits:
            return hits[:limit]
        
        return []
    
    async def _search_playwright(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Busca usando Playwright para renderizar JavaScript."""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Agregar delays para no parecer bot
                await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => false})")
                
                search_url = f"{self.base_url}/?s={query.replace(' ', '+')}&post_type=product"
                await page.goto(search_url, wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(2000)  # Esperar a que cargue JS
                
                # Buscar productos
                html = await page.content()
                await browser.close()
                
                soup = BeautifulSoup(html, "html.parser")
                return self._extract_products(soup, query, limit)
                
        except Exception as e:
            print(f"Playwright error: {e}")
            return []
    
    def _search_with_requests(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Búsqueda con requests y retry logic."""
        urls = [
            f"{self.base_url}/?s={query.replace(' ', '+')}&post_type=product",
            f"{self.base_url}/?s={query.replace(' ', '+')}&woo-product",
            f"{self.base_url}/productos/?s={query.replace(' ', '+')}",
        ]
        
        for search_url in urls:
            for attempt in range(3):
                try:
                    r = self.session.get(search_url, timeout=15)
                    r.raise_for_status()
                    
                    soup = BeautifulSoup(r.text, "html.parser")
                    hits = self._extract_products(soup, query, limit)
                    
                    if hits:
                        return hits
                    break
                    
                except Exception:
                    time.sleep(1 + attempt)
                    continue
        
        return []
    
    def _rotate_user_agent(self):
        """Rota el User-Agent para evadir bot detection."""
        user_agents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        ]
        import random
        self.session.headers["User-Agent"] = random.choice(user_agents)
    
    def _extract_products(self, soup: BeautifulSoup, query: str, limit: int) -> List[Dict[str, Any]]:
        """Extrae productos del HTML."""
        hits = []
        
        # Búsqueda 1: WooCommerce estructura estándar
        product_elements = soup.find_all(re.compile("li|div"), {"class": re.compile(r"product", re.I)})

        if not product_elements:
            # Búsqueda 2: Links con href que contengan /product/
            product_elements = soup.find_all("a", href=re.compile(r"/product/|/productos/", re.I), limit=50)

        seen_urls = set()

        for elem in product_elements[:limit * 2]:  # Procesar más para filtrar
            try:
                # Para elementos tipo <a>
                if elem.name == "a":
                    link = elem
                    container = elem.find_parent(["li", "div"], recursive=True)
                else:
                    # Para elementos tipo <li> o <div>
                    link = elem.find("a", href=True)
                    container = elem
                    
                if not link or not link.get("href"):
                    continue

                url = link.get("href", "")
                if not url.startswith("http"):
                    url = self.base_url + url

                if url in seen_urls:
                    continue
                seen_urls.add(url)

                # Extraer título
                title = None
                
                # Buscar en h2/h3 dentro del contenedor
                if container:
                    title_elem = container.find(re.compile("h[1-6]"))
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                
                # Fallback: usar texto del link
                if not title:
                    title = link.get_text(strip=True)

                if not title or len(title) < 3:
                    continue

                # Extraer precio
                price = None
                if container:
                    price = self._extract_woo_price(container)
                else:
                    price = self._extract_woo_price(elem)

                # Si no encontramos precio, buscar en el documento
                if not price:
                    parent = link.find_parent(["article", "li", "div"], recursive=True)
                    if parent:
                        price = self._extract_woo_price(parent)

                hits.append({
                    "title": title,
                    "url": url,
                    "price": price,
                    "available": True,
                    "provider": "lapiz_lopez",
                })

                if len(hits) >= limit:
                    break

            except Exception:
                continue

        return hits

    def _extract_woo_price(self, elem) -> Optional[int]:
        """Extrae precio desde elemento WooCommerce."""
        if not elem:
            return None
            
        # Búsqueda 1: <span class="price">
        price_span = elem.find("span", {"class": re.compile(r"price|amount|woocommerce-Price-amount", re.I)})
        if price_span:
            price_text = price_span.get_text(strip=True)
            return self._parse_clp_price(price_text)

        # Búsqueda 2: Buscar cualquier elemento con clase que contenga "price"
        for span in elem.find_all("span"):
            classes = span.get("class", [])
            if any("price" in str(c).lower() for c in classes):
                return self._parse_clp_price(span.get_text(strip=True))

        # Búsqueda 3: Usar regex en todo el texto
        text = elem.get_text()
        
        # Patrón: $ seguido de dígitos con puntos
        match = re.search(r"\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)", text)
        if match:
            return self._parse_clp_price(match.group(1))

        # Patrón: números de 4-7 dígitos
        matches = re.findall(r"\b(\d{4,7})\b", text)
        for match_str in matches:
            try:
                price = int(match_str)
                if 100 <= price <= 500000:
                    return price
            except ValueError:
                pass

        return None

    def _parse_clp_price(self, price_text: str) -> Optional[int]:
        """Convierte texto a precio CLP."""
        if not price_text:
            return None

        # Elimina símbolo $ y espacios
        price_text = price_text.replace("$", "").strip()
        
        # Elimina puntos (miles) y comas (decimales) - en Chile: 2.990 = dos mil novecientos noventa
        price_text = price_text.replace(".", "").replace(",", "")

        try:
            return int(price_text)
        except ValueError:
            return None


def quote_lapiz_lopez(query: str, limit: int = 5) -> Dict[str, Any]:
    """
    Busca productos en Lápiz López.
    """
    cli = LapizLopezClient(timeout=15)
    try:
        hits = cli.search(query, limit=limit)
        return {
            "query": query,
            "provider": "lapiz_lopez",
            "status": "ok" if hits else "not_found",
            "hits": hits,
            "error": None,
        }
    except Exception as e:
        return {
            "query": query,
            "provider": "lapiz_lopez",
            "status": "error",
            "hits": [],
            "error": str(e),
        }
