# Fuentes de precios

Validación en vivo más reciente: 26 de agosto de 2026 — **69 fuentes publicadas**.

Todas se consultan directamente en la tienda, usando el mismo endpoint público
que usa su vitrina web. Ninguna depende de un metabuscador externo, de
credenciales ni de eludir protecciones anti-bot.

## Cómo se integran

Cada plataforma tiene un parser genérico en `app/providers/structured_stores.py`,
así que sumar una tienda que corra sobre una plataforma ya soportada es agregar
una línea al diccionario correspondiente:

| Plataforma | Endpoint | Diccionario |
| --- | --- | --- |
| Shopify | `/search/suggest.json` | `SHOPIFY_STORES` |
| WooCommerce | `/wp-json/wc/store/v1/products` | `WOOCOMMERCE_STORES` |
| Jumpseller | `/search?q=` (HTML) | `JUMPSELLER_STORES` |
| Magento | `/catalogsearch/result/?q=` (HTML) | `MAGENTO_STORES` |
| PrestaShop | `/search?controller=search` (HTML) | `PRESTASHOP_STORES` |
| Tiendanube | `/search/?q=` (HTML) | `TIENDANUBE_STORES` |
| VTEX | HTML de resultados | `search_casaroyal` |

Antes de sumar un dominio conviene sondear qué plataforma usa: basta pedir la
home y buscar la huella (`cdn.shopify.com`, `wp-content/plugins/woocommerce`,
`jumpseller`, `catalogsearch`, `js-product-miniature`, `tiendanube`).

## Fuentes publicadas

### Educación, librería y papelería (26)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Dimeiggs | General, Oficina, Casa y hogar, Tecnología, Educación | Búsqueda pública del sitio |
| Librería Nacional | Oficina, Educación | Búsqueda pública del sitio |
| Pronobel | Oficina, Educación | Búsqueda pública del sitio |
| Prisa | Oficina, Educación | Búsqueda pública del sitio |
| La Secretaria | Oficina, Educación | Búsqueda pública del sitio |
| Siempre Listos | Oficina, Educación | Shopify — Predictive Search público |
| Librería Arteideas | Oficina, Educación | Shopify — Predictive Search público |
| La Papelaria | Oficina, Educación | Shopify — Predictive Search público |
| Librería Acuario | Oficina, Educación | Shopify — Predictive Search público |
| Bazarte | Oficina, Educación | Shopify — Predictive Search público |
| Librería Meiggs | Oficina, Educación | Shopify — Predictive Search público |
| Comercial CR | Oficina, Educación | WooCommerce — Store API pública |
| TecnoÚtiles | Oficina, Educación, Tecnología | WooCommerce — Store API pública |
| Feliz Group | Oficina, Educación | Jumpseller — HTML público |
| Torre | Oficina, Educación | WooCommerce — Store API pública |
| Librería Olímpica | Oficina, Educación | PrestaShop — HTML público |
| Antártica | Educación | Magento — HTML público |
| ElCuaderno | Oficina, Educación | Jumpseller — HTML público |
| Librería Mabeduna | Oficina, Educación | Jumpseller — HTML público |
| Librería Nené | Oficina, Educación | Jumpseller — HTML público |
| Dibu | Educación, Oficina | Shopify — Predictive Search público |
| Jabes Chile | Educación, Oficina | WooCommerce — Store API pública |
| Somos Arte | Educación | WooCommerce — Store API pública |
| La Casa del Arte | Educación, Oficina | Jumpseller — HTML público |
| ArteManía | Educación, Oficina | PrestaShop — HTML público |
| Tienda Diseñarte | Educación, Oficina | Tiendanube — HTML público |

### Construcción y ferretería (9)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Construfer | Construcción | Jumpseller — HTML público |
| Ferretería Prat | Construcción | Magento — HTML público |
| Hangar 77 | Construcción | WooCommerce — Store API pública |
| Construplaza | Construcción, Casa y hogar | Magento — HTML público |
| Patio Ferretero | Construcción | Shopify — Predictive Search público |
| Total Tools | Construcción | Shopify — Predictive Search público |
| Ferre Store | Construcción | WooCommerce — Store API pública |
| Chileferret | Construcción | WooCommerce — Store API pública |
| Herramientas Ferretería | Construcción | WooCommerce — Store API pública |

### Casa, hogar y aseo (22)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Fasit | Oficina, Casa y hogar | Magento — HTML público |
| Kitchen Center | Casa y hogar | Shopify — Predictive Search público |
| Home Mobili | Casa y hogar, Oficina | Shopify — Predictive Search público |
| Fissman | Casa y hogar | Shopify — Predictive Search público |
| Kitchen House | Casa y hogar | Shopify — Predictive Search público |
| Weitzler | Casa y hogar | WooCommerce — Store API pública |
| Santa Mariana | Casa y hogar | Jumpseller — HTML público |
| BazarED | Casa y hogar, General | Shopify — Predictive Search público |
| Portomenaje | Casa y hogar | Shopify — Predictive Search público |
| Tienda Copec | Casa y hogar, General | Shopify — Predictive Search público |
| Home Online | Casa y hogar, Tecnología | Shopify — Predictive Search público |
| Rosen | Casa y hogar | Magento — HTML público |
| Fullmuebles | Oficina, Casa y hogar | Shopify — Predictive Search público |
| Dimensiona | Oficina, Casa y hogar | WooCommerce — Store API pública |
| Productos de Aseo | Casa y hogar, Oficina | WooCommerce — Store API pública |
| Llabrés | Casa y hogar, Oficina | WooCommerce — Store API pública |
| Maxitech | General, Oficina, Casa y hogar, Tecnología | Shopify — Predictive Search público |
| Casa Royal | General, Casa y hogar, Tecnología | VTEX — HTML público |
| Apishop | Casa y hogar, Supermercado | Shopify — Predictive Search público |
| RGC Distribución | Supermercado, Casa y hogar | WooCommerce — Store API pública |
| Aseo por Mayor | Supermercado, Casa y hogar | WooCommerce — Store API pública |
| Outlet de Aseo | Supermercado, Casa y hogar | Jumpseller — HTML público |

### Tecnología (5)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Alltec | Tecnología, Oficina | PrestaShop — HTML público |
| Chile PC | Tecnología | WooCommerce — Store API pública |
| Cintegral | Tecnología | WooCommerce — Store API pública |
| Notebook Store | Tecnología, Oficina | Jumpseller — HTML público |
| CompuElite | Tecnología | Jumpseller — HTML público |

### Supermercado y abarrotes (5)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Alimentika | Supermercado | WooCommerce — Store API pública |
| Distribuidora Santiago | Supermercado | WooCommerce — Store API pública |
| MiniMayorista | Supermercado | WooCommerce — Store API pública |
| Distribuidora Online | Supermercado | WooCommerce — Store API pública |
| Fermarket | Supermercado | Jumpseller — HTML público |

### Oficina (2)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Prido | Oficina | WooCommerce — Store API pública |
| Euromob | Oficina | WooCommerce — Store API pública |

### Fuentes por área

| Área | Fuentes |
| --- | --- |
| General | 5 |
| Construcción | 9 |
| Oficina | 35 |
| Casa y hogar | 24 |
| Tecnología | 10 |
| Educación | 26 |
| Supermercado | 9 |

## Fuera de alcance

No se integraron sitios que exigían tienda física para mostrar precios,
devolvían 401/403, usaban desafíos anti-bot (Cloudflare, PerimeterX, Akamai) o
no producían resultados con precio de forma repetible. Esto incluye a los
grandes retailers: Falabella, Paris, Ripley, Sodimac, Easy, Líder, Jumbo,
Unimarc, Dimerc, PC Factory y SP Digital, entre otros.

También quedaron fuera catálogos de marca sin precio publicado (proarte.cl) y
sitios cuyo WooCommerce no expone la Store API (artel.cl, officepro.cl,
embalados.cl, tiendaferretera.cl).

MercadoLibre queda declarado pero no disponible: su API exige acceso autorizado.

## Límites de tasa

Shopify aplica un límite **por IP** sobre `/search/suggest.json`. Como 20 de las
fuentes publicadas corren sobre Shopify y el backend sale por una sola IP, al
excederlo **caen todas juntas** con 429. Se observó al correr el validador
completo varias veces seguidas; el bloqueo dura del orden de 5 a 10 minutos y se
levanta solo.

Mitigaciones ya aplicadas:

- `_get()` en `structured_stores.py` reintenta una vez ante 429/503, respetando
  `Retry-After`. Sirve para un 429 aislado, no para un bloqueo sostenido.
- `scripts/validate_sources.py` corre con concurrencia 4 y espera 5 s entre
  intentos, para no gatillar el límite contra sí mismo.

Pendiente si el tráfico crece: cachear `(fuente, consulta)` por unos minutos.
Las listas escolares repiten mucho las mismas consultas ("cuaderno universitario
100 hojas"), así que un caché corto bajaría el volumen de forma significativa.

## Revalidación

```bash
venv/bin/python scripts/validate_sources.py
```

Falla con código distinto de cero si una fuente no devuelve al menos un
resultado con precio para su consulta de control. Una fuente puede fallar por
caída de la tienda y no por el parser: conviene confirmarlo con `curl` antes de
tocar código. Los parsers tienen pruebas aisladas en
`tests/test_structured_stores.py`, y `tests/test_provider_registry.py` verifica
que backend, orquestador, validador y frontend declaren la misma nómina.
