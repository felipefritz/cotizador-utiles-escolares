"""
Quoting module for Jumbo / Líder (Walmart Chile).
Both sites have similar structure and search endpoints.
Soporta búsqueda con Playwright para sitios con JavaScript.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
import requests
from bs4 import BeautifulSoup
import re
import unicodedata
import json
import asyncio
import time
from pathlib import Path

# Playwright - opcional, solo si está disponible
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class JumboLiderClient:
    """
    Busca y cotiza productos en Jumbo.cl o Lider.cl.
    Ambos son Walmart Chile y comparten infraestructura similar.
    Soporta búsqueda por API cuando está disponible, con fallback a scraping.
    """

    def __init__(self, retailer: str = "jumbo", timeout: int = 15):
        """
        Args:
            retailer: "jumbo" o "lider"
            timeout: segundos para request
        """
        self.retailer = retailer.lower()
        self.timeout = timeout
        self.session = requests.Session()
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Pragma": "no-cache",
        }
        
        if self.retailer == "jumbo":
            headers["Referer"] = "https://www.jumbo.cl/"
        else:
            headers["Referer"] = "https://www.lider.cl/"
            # Líder requiere headers adicionales específicos
            headers["Content-Length"] = "0"
            headers["Sec-Ch-Ua"] = '"Not_A Brand";v="8", "Chromium";v="120"'
            headers["Sec-Ch-Ua-Mobile"] = "?0"
            headers["Sec-Ch-Ua-Platform"] = '"macOS"'
        
        self.session.headers.update(headers)

        if self.retailer == "jumbo":
            self.base_url = "https://www.jumbo.cl"
            self.search_url = "https://www.jumbo.cl/search"
            self.api_url = "https://www.jumbo.cl/api/search"
        elif self.retailer == "lider":
            self.base_url = "https://www.lider.cl"
            self.search_url = "https://www.lider.cl/search"
            self.api_url = "https://www.lider.cl/api/search"
        else:
            raise ValueError(f"Retailer '{retailer}' no soportado. Use 'jumbo' o 'lider'.")

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca productos en Jumbo o Líder con Playwright como estrategia principal.
        - Ambos sitios cargan contenido con JavaScript
        - Usar Playwright para renderizar como navegador real
        """
        query = (query or "").strip()
        if not query:
            return []

        # Usar Playwright para ambos retailers (mejor resultado)
        if PLAYWRIGHT_AVAILABLE:
            try:
                hits = asyncio.run(self._search_playwright(query, limit))
                if hits:
                    return hits[:limit]
            except Exception as e:
                print(f"Playwright error: {e}")
                # Fallback a HTML scraping
        
        # Fallback: Intentar HTML scraping robusto
        hits = self._search_html_robust(query, limit)
        if hits:
            return hits[:limit]
        
        # Último fallback: buscar ANY links
        hits = self._search_any_products(query, limit)
        return hits[:limit]

    async def _search_playwright(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Busca usando Playwright para renderizar JavaScript."""
        if not PLAYWRIGHT_AVAILABLE:
            return []
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Navegar a la búsqueda
                search_url_with_query = f"{self.search_url}?q={query.replace(' ', '+')}"
                await page.goto(search_url_with_query, wait_until="networkidle", timeout=15000)
                
                # Esperar a que carguen los productos (varios selectores posibles)
                selectors = [
                    "a[href*='/producto/']",
                    "a[href*='/p/']",
                    "[data-testid='product']",
                    "[role='link'][href*='/']",
                ]
                
                for selector in selectors:
                    try:
                        await page.wait_for_selector(selector, timeout=2000)
                        break
                    except:
                        continue
                
                # Pequeña espera para que se estabilice
                await page.wait_for_timeout(1000)
                
                # Obtener HTML renderizado
                html = await page.content()
                await browser.close()
                
                # Parsear con BeautifulSoup
                soup = BeautifulSoup(html, "html.parser")
                hits = []
                
                # Palabras clave que indican publicidad/no-producto
                bad_keywords = [
                    "facebook", "instagram", "tiktok", "youtube", "twitter",
                    "síguenos", "compartir", "comentar", "me gusta",
                    "avance", "tarjeta", "cencosud", "simula", "crédito",
                    "banco", "seguros", "viajes", "ayuda", "contacto", "login",
                    "newsletter", "suscribirse", "ofertas exclusivas", "súper"
                ]
                
                # Estrategia 1: Links a productos específicos
                product_links = soup.find_all("a", href=re.compile(r"/(producto|p|product)/", re.I))
                
                # Si no encuentra con eso, buscar todos los links que podrían ser productos
                if not product_links:
                    all_links = soup.find_all("a", href=True)
                    product_links = [l for l in all_links if self._looks_like_product_link(l)][:20]
                
                for link in product_links:
                    try:
                        title = link.get_text(strip=True)
                        if not title or len(title) < 3:
                            continue
                        
                        # Filtrar por keywords
                        title_lower = title.lower()
                        if any(x in title_lower for x in bad_keywords):
                            continue
                        
                        href = link.get("href", "")
                        if not href:
                            continue
                        
                        # Filtrar URLs sospechosas
                        href_lower = href.lower()
                        if any(x in href_lower for x in ["tarjeta", "cencosud", "simula"]):
                            continue
                        
                        url = href
                        if not url.startswith("http"):
                            url = self.base_url + url
                        
                        if any(h["url"] == url for h in hits):
                            continue
                        
                        # Extraer precio
                        container = link.find_parent(["div", "article", "li"], recursive=True)
                        price = None
                        if container:
                            price = self._extract_price_from_container(container)
                        
                        available_text = (container.get_text().lower() if container else "") + title.lower()
                        available = "agotado" not in available_text and "no disponible" not in available_text
                        
                        hits.append({
                            "title": title,
                            "url": url,
                            "price": price,
                            "available": available,
                            "provider": self.retailer,
                        })
                        
                        if len(hits) >= limit:
                            break
                        
                    except Exception:
                        continue
                
                return hits
        except Exception:
            return []

    def _search_api(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Busca por API REST si está disponible."""
        try:
            params = {
                "q": query,
                "limit": limit,
            }
            r = self.session.get(self.api_url, params=params, timeout=self.timeout)
            r.raise_for_status()
            data = r.json()
            
            # Estructura esperada varía, pero normalmente hay lista "products" o "hits"
            products = data.get("products", data.get("results", data.get("hits", [])))
            
            # Palabras clave que indican publicidad/no-producto
            bad_keywords = [
                "facebook", "instagram", "tiktok", "youtube", "twitter",
                "síguenos", "compartir", "comentar", "me gusta",
                "avance", "tarjeta", "cencosud", "simula", "crédito",
                "banco", "seguros", "viajes", "ayuda", "contacto", "login",
                "newsletter", "suscribirse", "ofertas exclusivas", "súper"
            ]
            
            hits = []
            for prod in products[:limit]:
                try:
                    title = prod.get("name") or prod.get("title") or prod.get("description")
                    if not title:
                        continue
                    
                    # Filtrar publicidad por keywords
                    title_lower = title.lower()
                    if any(x in title_lower for x in bad_keywords):
                        continue
                    
                    url = prod.get("url") or prod.get("link")
                    if url and not url.startswith("http"):
                        url = self.base_url + url
                    
                    if not url:
                        continue
                    
                    # Filtrar publicidad por URL
                    if "tarjeta" in url.lower() or "cencosud" in url.lower():
                        continue
                    
                    price = None
                    if "price" in prod:
                        try:
                            price = int(float(prod["price"]))
                        except (ValueError, TypeError):
                            pass
                    
                    available = prod.get("available", True)
                    
                    hits.append({
                        "title": title,
                        "url": url,
                        "price": price,
                        "available": available,
                        "provider": self.retailer,
                    })
                except Exception:
                    continue
            
            return hits
        except Exception:
            # Si API falla, devolvemos lista vacía para intentar HTML
            return []

    def _search_html(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Fallback: scraping del HTML de búsqueda."""
        try:
            params = {"q": query}
            r = self.session.get(self.search_url, params=params, timeout=self.timeout)
            r.raise_for_status()
        except Exception:
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        hits = []

        # Palabras clave que indican publicidad/no-producto
        bad_keywords = [
            "facebook", "instagram", "tiktok", "youtube", "twitter",
            "síguenos", "compartir", "comentar", "me gusta",
            "avance", "tarjeta", "cencosud", "simula", "crédito",
            "banco", "seguros", "viajes", "ayuda", "contacto", "login",
            "newsletter", "suscribirse", "ofertas exclusivas"
        ]

        # Buscar contenedores de productos
        product_containers = soup.find_all("div", {"class": re.compile(r"product", re.I)}, limit=100)
        
        if not product_containers:
            product_containers = soup.find_all(re.compile("article|li"), {"class": re.compile(r"product|item", re.I)}, limit=100)
        
        # Si aún no hay contenedores, buscar por estructura de links
        if not product_containers:
            product_links = soup.find_all("a", href=re.compile(r"/(producto|p|product)", re.I), limit=100)
            for link in product_links:
                try:
                    href = link.get("href", "")
                    title = link.get_text(strip=True)
                    
                    if not title or len(title) < 3:
                        continue
                    
                    if any(x in title.lower() for x in bad_keywords):
                        continue
                    
                    url = href if href.startswith("http") else self.base_url + href
                    
                    if any(h["url"] == url for h in hits):
                        continue
                    
                    container = link.find_parent(["div", "article", "li"], recursive=True)
                    price = None
                    if container:
                        price = self._extract_price_from_container(container)
                    
                    available_text = (container.get_text().lower() if container else "") + title.lower()
                    available = "agotado" not in available_text and "no disponible" not in available_text
                    
                    hits.append({
                        "title": title,
                        "url": url,
                        "price": price,
                        "available": available,
                        "provider": self.retailer,
                    })
                    
                    if len(hits) >= limit:
                        break
                except Exception:
                    continue
            return hits
        
        # Procesar contenedores de productos encontrados
        for container in product_containers:
            try:
                # Buscar link de producto dentro del contenedor
                link = container.find("a", href=re.compile(r"/(producto|p|product)", re.I))
                if not link:
                    link = container.find("a", href=True)
                
                if not link:
                    continue
                
                href = link.get("href", "")
                title = link.get_text(strip=True)
                
                if not title or len(title) < 3 or not href:
                    continue
                
                # Filtrar publicidad
                if any(x in title.lower() for x in bad_keywords):
                    continue
                
                url = href if href.startswith("http") else self.base_url + href
                
                # Evitar duplicados
                if any(h["url"] == url for h in hits):
                    continue
                
                # Extraer precio
                price = self._extract_price_from_container(container)
                
                available_text = container.get_text().lower()
                available = "agotado" not in available_text and "no disponible" not in available_text
                
                hits.append({
                    "title": title,
                    "url": url,
                    "price": price,
                    "available": available,
                    "provider": self.retailer,
                })
                
                if len(hits) >= limit:
                    break
                    
            except Exception:
                continue

        return hits

    def _extract_price_from_container(self, container) -> Optional[int]:
        """Extrae precio en CLP desde un contenedor de producto."""
        if not container:
            return None
            
        text = container.get_text()
        
        # Patrón 1: $ seguido de dígitos con puntos (e.g., $2.990, $12.990)
        # Este es el patrón más común en Chile
        match = re.search(r"\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)", text)
        if match:
            price_str = match.group(1)
            # Eliminar puntos (separador de miles) y comas (separador decimal)
            price_str = price_str.replace(".", "").replace(",", "")
            try:
                price = int(price_str)
                if 100 <= price <= 10000000:  # rango razonable en CLP
                    return price
            except ValueError:
                pass
        
        # Patrón 2: Números grandes sin símbolo (e.g., 2990, 12990)
        # Buscar números de 4-7 dígitos
        matches = re.findall(r"\b(\d{4,7})\b", text)
        for match_str in matches:
            try:
                price = int(match_str)
                # Rango razonable: entre 100 y 10 millones CLP
                if 100 <= price <= 10000000:
                    # Preferir números en rango típico de útiles (100-50mil)
                    if 100 <= price <= 500000:
                        return price
            except ValueError:
                pass
        
        # Patrón 3: Si hay varios números, buscar el primero en rango razonable
        if matches:
            try:
                price = int(matches[0])
                if 100 <= price <= 10000000:
                    return price
            except ValueError:
                pass

        return None

    def _looks_like_product_link(self, link) -> bool:
        """Heurística: ¿parece este link un producto?"""
        try:
            href = link.get("href", "")
            title = link.get_text(strip=True)
            
            # Debe tener título razonable
            if not title or len(title) < 5:
                return False
            
            # No debe ser un link corto o especial
            if len(href) < 10:
                return False
            
            # No debe ser links de navegación
            nav_keywords = ["ayuda", "contacto", "account", "carrito", "pago", "home", "menu"]
            if any(x in href.lower() or x in title.lower() for x in nav_keywords):
                return False
            
            # Preferir URLs que tengan estructura de producto
            if any(x in href.lower() for x in ["/p/", "/producto", "/product", "sku="]):
                return True
            
            # Si no, aceptar si es URL relativa larga (probablemente producto)
            return not href.startswith("javascript") and not href.startswith("mailto")
        except:
            return False

    def _search_html_robust(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Búsqueda HTML robusta con retry y múltiples estrategias.
        """
        bad_keywords = [
            "facebook", "instagram", "tiktok", "youtube", "twitter",
            "tarjeta", "cencosud", "simula", "crédito", "banco",
            "avance", "súper", "newsletter", "suscribirse"
        ]
        
        urls_to_try = [
            f"{self.search_url}?q={query}",
            f"{self.base_url}/search?q={query}",
        ]
        
        for url in urls_to_try:
            try:
                # Retry con backoff exponencial - especialmente importante para Líder
                for retry in range(4):
                    try:
                        r = self.session.get(url, timeout=self.timeout)
                        r.raise_for_status()
                        break
                    except requests.exceptions.HTTPError as e:
                        # Si es error 412 en Líder, intentar de nuevo con espera
                        if e.response.status_code == 412 and self.retailer == "lider":
                            if retry < 3:
                                wait_time = (2 ** retry) + 1  # 2s, 3s, 5s, 9s
                                time.sleep(wait_time)
                            else:
                                raise
                        else:
                            raise
                    except requests.exceptions.RequestException:
                        if retry < 3:
                            time.sleep(2 ** retry)  # 1s, 2s, 4s, 8s
                        else:
                            raise
                
                soup = BeautifulSoup(r.text, "html.parser")
                hits = []
                
                # Intentar encontrar productos
                # Estrategia 1: Divs con class producto
                products = soup.find_all("div", class_=lambda x: x and "product" in x.lower(), limit=50)
                
                # Estrategia 2: Si no hay, buscar articles
                if not products:
                    products = soup.find_all("article", limit=50)
                
                # Estrategia 3: Si no hay, buscar links de productos
                if not products:
                    products = soup.find_all("a", href=re.compile(r"/(product|p|producto)", re.I), limit=50)
                
                for product in products:
                    try:
                        # Buscar link
                        link = product.find("a", href=True)
                        if not link:
                            link = product
                        
                        title = link.get_text(strip=True)
                        href = link.get("href", "")
                        
                        if not title or len(title) < 3 or not href:
                            continue
                        
                        # Filtro de keywords
                        if any(kw in title.lower() for kw in bad_keywords):
                            continue
                        
                        # URL debe parecer producto
                        if not any(x in href.lower() for x in ["product", "/p/", "producto"]):
                            continue
                        
                        url_full = href if href.startswith("http") else self.base_url + href
                        
                        # Evitar duplicados
                        if any(h["url"] == url_full for h in hits):
                            continue
                        
                        price = self._extract_price_from_container(product if hasattr(product, 'get_text') else link)
                        
                        hits.append({
                            "title": title,
                            "url": url_full,
                            "price": price,
                            "available": True,
                            "provider": self.retailer,
                        })
                        
                        if len(hits) >= limit:
                            break
                    except Exception:
                        continue
                
                if hits:
                    return hits
                    
            except Exception as e:
                print(f"HTML search error for {url}: {e}")
                continue
        
        return []

    def _search_any_products(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fallback extremo: buscar ANY links que parezcan productos.
        """
        try:
            r = self.session.get(f"{self.search_url}?q={query}", timeout=10)
            soup = BeautifulSoup(r.text, "html.parser")
            
            bad_keywords = [
                "facebook", "instagram", "twitter", "tarjeta", "cencosud",
                "avance", "crédito", "banco", "newsletter"
            ]
            
            hits = []
            all_links = soup.find_all("a", href=True)
            
            for link in all_links:
                title = link.get_text(strip=True)
                href = link.get("href", "")
                
                if not title or len(title) < 3:
                    continue
                
                if any(kw in title.lower() for kw in bad_keywords):
                    continue
                
                # Solo links que sean relativamente largos (probablemente productos)
                if len(href) < 10:
                    continue
                
                url_full = href if href.startswith("http") else self.base_url + href
                
                if any(h["url"] == url_full for h in hits):
                    continue
                
                hits.append({
                    "title": title,
                    "url": url_full,
                    "price": None,
                    "available": True,
                    "provider": self.retailer,
                })
                
                if len(hits) >= limit:
                    break
            
            return hits
        except Exception:
            return []


def quote_jumbo(query: str, limit: int = 5) -> Dict[str, Any]:
    """
    Busca productos en Jumbo y devuelve formato consistente.
    NOTA: Jumbo carga contenido con JavaScript, por lo que la búsqueda
    puede ser limitada. Se recomienda usar Dimeiggs, Líder o Lápiz López.
    """
    cli = JumboLiderClient(retailer="jumbo", timeout=15)
    try:
        hits = cli.search(query, limit=limit)
        return {
            "query": query,
            "provider": "jumbo",
            "status": "ok" if hits else "not_found",
            "hits": hits,
            "error": None,
        }
    except Exception as e:
        return {
            "query": query,
            "provider": "jumbo",
            "status": "error",
            "hits": [],
            "error": f"Jumbo requiere JavaScript para búsqueda. Intenta en el navegador: https://www.jumbo.cl/search?q={query.replace(' ', '+')}",
        }


def quote_lider(query: str, limit: int = 5) -> Dict[str, Any]:
    """
    Busca productos en Líder y devuelve formato consistente.
    """
    cli = JumboLiderClient(retailer="lider", timeout=15)
    try:
        hits = cli.search(query, limit=limit)
        return {
            "query": query,
            "provider": "lider",
            "status": "ok" if hits else "not_found",
            "hits": hits,
            "error": None,
        }
    except Exception as e:
        return {
            "query": query,
            "provider": "lider",
            "status": "error",
            "hits": [],
            "error": str(e),
        }
