"""
Prisa.cl - Tienda online especializada en útiles escolares y artículos de papelería.
Cliente para búsqueda de productos.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from Crypto.Cipher import AES



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
    # Prisa usa slugs directos para productos (ej: /cuaderno-universitario-...)
    if any(x in u for x in ["/product/", "/products/", "/producto/", "/productos/", "/item/", "/items/"]):
        return True
    # slug directo con un solo segmento
    if u.startswith("/") and u.count("/") == 1 and len(u) > 2:
        return True
    return False


def _is_bad_title(title: str) -> bool:
    t = " ".join(title.lower().split())
    if not t or len(t) < 3:
        return True
    return any(x in t for x in BLACKLIST_TITLE_PARTS)


def _extract_challenge_params(html: str) -> Tuple[str, str, str, Optional[str]] | None:
    """
    Extrae (a,b,c,redirect_url) desde el JS challenge de Prisa.
    Retorna None si no encuentra el challenge.
    """
    # El HTML tiene tres toNumbers; capturamos todos
    params = re.findall(r'toNumbers\("([0-9a-f]+)"\)', html, re.IGNORECASE)
    if len(params) < 3:
        return None
    key_hex, iv_hex, cipher_hex = params[0], params[1], params[2]

    redirect_url = None
    m = re.search(r'document\.location\.href="([^"]+)"', html)
    if m:
        redirect_url = m.group(1)

    return key_hex, iv_hex, cipher_hex, redirect_url


def _solve_js_challenge(html: str) -> Tuple[str, Optional[str]] | None:
    """
    Resuelve el challenge JS de Prisa y retorna (cookie_value, redirect_url).
    """
    params = _extract_challenge_params(html)
    if not params:
        return None
    key_hex, iv_hex, cipher_hex, redirect_url = params

    key = bytes.fromhex(key_hex)
    iv = bytes.fromhex(iv_hex)
    cipher_bytes = bytes.fromhex(cipher_hex)

    aes = AES.new(key, AES.MODE_CBC, iv)
    plaintext = aes.decrypt(cipher_bytes)

    # JS hace toHex sobre los bytes en crudo
    cookie_value = plaintext.hex()
    return cookie_value, redirect_url


class PrisaClient:
    """
    Busca productos en Prisa.cl - tienda de útiles escolares.
    Nota: El sitio usa JavaScript extensively, intentamos scraping estático.
    """

    def __init__(self, timeout: int = 15):
        self.base_url = "https://www.prisa.cl"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": "https://www.prisa.cl",
        })

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca productos en Prisa.cl usando endpoint de búsqueda
        """
        query = (query or "").strip()
        if not query:
            return []

        try:
            # URL correcta de búsqueda para Prisa
            search_url = f"{self.base_url}/product/search?search={query}"
            r = self.session.get(search_url, timeout=self.timeout)
            r.raise_for_status()

            # Resolver challenge JS si es necesario
            if "slowAES.decrypt" in r.text and "document.location.href" in r.text:
                solved = _solve_js_challenge(r.text)
                if solved:
                    cookie_value, redirect_url = solved
                    self.session.cookies.set("OCXS", cookie_value, domain="www.prisa.cl", path="/")
                    follow_url = redirect_url or search_url
                    r = self.session.get(follow_url, timeout=self.timeout)
                    r.raise_for_status()
            
            hits = self._parse_results(r.text, query, limit)
            if hits:
                return hits

            # Fallback: renderizado con Playwright (sitio dinámico)
            return self._search_with_playwright(query, limit)
            
        except Exception as e:
            return []

    def _parse_results(self, html: str, query: str, limit: int) -> List[Dict[str, Any]]:
        """Extrae productos de resultados de búsqueda."""
        soup = BeautifulSoup(html, "html.parser")
        hits = []
        seen_urls = set()
        
        # Buscar elementos que puedan ser productos
        # Estrategias múltiples
        candidates = []
        
        # 1. Buscar articles
        candidates.extend(soup.find_all("article"))
        
        # 2. Buscar divs con clases que sugieren productos
        candidates.extend(soup.find_all("div", class_=lambda x: x and any(c in (x or "").lower() for c in ["product", "item", "result"])))
        
        # 3. Buscar links que apunten a productos
        product_links = soup.find_all("a", href=lambda x: x and any(p in (x or "").lower() for p in ["/products/", "/product/", "/item/", "/items/"]))
        candidates.extend([link.find_parent(["div", "article", "li"]) or link for link in product_links])
        
        for container in candidates:
            if len(hits) >= limit:
                break
            
            if not container:
                continue
            
            try:
                # Buscar enlace al producto
                if container.name == "a":
                    link = container
                else:
                    link = container.find("a", href=True)
                
                if not link:
                    continue
                
                href = link.get("href", "").strip()
                if not href or href.startswith("javascript:") or href == "#":
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
                title = link.get_text(strip=True) if link else ""
                
                # Si el contenedor no es el link, buscar mejor título
                if container.name != "a":
                    title_elem = container.find(["h2", "h3", "h4", "span"], class_=lambda x: x and any(c in (x or "").lower() for c in ["title", "name"]))
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                
                if not title or len(title) < 3:
                    continue

                title = " ".join(title.split())
                if _is_bad_title(title):
                    continue

                if not _has_query_overlap(query, title):
                    continue
                
                # Extraer precio
                price = self._extract_price(container if container.name != "a" else container.find_parent("div") or container)
                
                # Extraer imagen
                if container.name == "a":
                    img = container.find("img", src=True)
                else:
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
                    "provider": "prisa",
                })
                
            except Exception:
                pass
        
        return hits

    def _search_with_playwright(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Fallback dinámico para Prisa usando Playwright."""
        try:
            from playwright.sync_api import sync_playwright
        except Exception:
            return []

        search_url = f"{self.base_url}/product/search?search={query}"

        js = """() => {
          const items = Array.from(document.querySelectorAll('.product-item'));
          return items.map(it => {
            const gtm = it.querySelector('[data-gtm-model]');
            const gtmData = gtm ? gtm.getAttribute('data-gtm-model') : null;
            const title = (it.querySelector('.product-item__title') || {}).innerText || null;
            const linkEl = it.querySelector('a.view-product, a.view-product-gallery, a[href*="/product/"]');
            const link = linkEl ? linkEl.getAttribute('href') : null;
            const priceText = (it.querySelector('.product-price__specifications-value') || {}).innerText || null;
            const imgEl = it.querySelector('img');
            const img = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : null;
            return { gtmData, title, link, priceText, img };
          });
        }"""

        hits: List[Dict[str, Any]] = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(search_url, wait_until="networkidle", timeout=60000)
            data = page.evaluate(js)
            browser.close()

        for row in data:
            if len(hits) >= limit:
                break

            title = (row.get("title") or "").strip()
            link = row.get("link") or ""
            gtm_data = row.get("gtmData") or ""

            if not title and gtm_data:
                try:
                    import json
                    gtm_obj = json.loads(gtm_data)
                    title = (gtm_obj.get("name") or "").strip()
                except Exception:
                    pass

            if not title or _is_bad_title(title):
                continue

            if not _has_query_overlap(query, title):
                continue

            if link and not link.startswith("http"):
                link = self.base_url + (link if link.startswith("/") else "/" + link)

            # precio: desde gtmData.price o priceText
            price = None
            if gtm_data:
                try:
                    import json
                    gtm_obj = json.loads(gtm_data)
                    if gtm_obj.get("price") is not None:
                        price = int(float(gtm_obj.get("price")))
                except Exception:
                    pass

            if price is None and row.get("priceText"):
                numbers = re.findall(r"\d+(?:[.,]\d+)*", row.get("priceText") or "")
                if numbers:
                    try:
                        price_str = numbers[-1].replace(".", "").replace(",", "")
                        price = int(float(price_str))
                    except (ValueError, TypeError):
                        pass

            image_url = row.get("img") or ""
            if image_url and not image_url.startswith("http"):
                image_url = self.base_url + (image_url if image_url.startswith("/") else "/" + image_url)

            hits.append({
                "title": title,
                "url": link,
                "price": price,
                "image_url": image_url,
                "available": True,
                "provider": "prisa",
            })

        return hits

    def _extract_price(self, element) -> Optional[int]:
        """Extrae precio de un elemento."""
        try:
            # Buscar elementos con precio
            for price_elem in element.find_all(["span", "div", "p"], class_=lambda x: x and any(c in (x or "").lower() for c in ["price", "precio", "valor"])):
                text = price_elem.get_text(strip=True)
                # Buscar números con formato de precio
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
