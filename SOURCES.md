# Fuentes de precios

Validación en vivo más reciente: 30 de septiembre de 2026, desde producción — **83 fuentes publicadas**
(ver "Validación desde producción" al final).
Revisión de QA del 29 de septiembre de 2026: 42 fuentes probadas en vivo desde
un navegador con consultas reales por área (ver "Hallazgos de QA" al final).

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
| VTEX | `/api/catalog_system/pub/products/search?ft=` | `VTEX_STORES` |
| SAP Commerce | `/search?q=` (HTML) | `search_petco` |
| Schema.org ItemList | HTML de resultados | `search_jumbo`, `search_lider` |
| Cencosud render data | `/busqueda?ft=` | `search_santaisabel` |
| Next.js page data | `/buscar?Ntt=` | `search_tottus` |
| Laravel + Inertia | `/busqueda?s=` (JSON en `script[data-page]`) | `app/providers/lasecretaria.py` |

Antes de sumar un dominio conviene sondear qué plataforma usa: basta pedir la
home y buscar la huella (`cdn.shopify.com`, `wp-content/plugins/woocommerce`,
`jumpseller`, `catalogsearch`, `js-product-miniature`, `tiendanube`).

## Fuentes publicadas

### Educación, librería y papelería (25)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Dimeiggs | General, Oficina, Casa y hogar, Tecnología, Educación | Búsqueda pública del sitio |
| Librería Nacional | Oficina, Educación | Búsqueda pública del sitio |
| Pronobel | Oficina, Educación | Shopify — Predictive Search público |
| La Secretaria | Oficina, Educación | Laravel/Inertia — estado JSON de la búsqueda |
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
| Ferretería Prat | Construcción | Shopify — Predictive Search (migró desde Magento) |
| Hangar 77 | Construcción | WooCommerce — Store API pública |
| Construplaza | Construcción, Casa y hogar | VTEX — API pública de catálogo |
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
| Casa Royal | General, Casa y hogar, Tecnología | VTEX — API pública de catálogo |
| Apishop | Casa y hogar, Supermercado | Shopify — Predictive Search público |
| RGC Distribución | Mayoristas, Casa y hogar | WooCommerce — Store API pública |
| Aseo por Mayor | Mayoristas, Casa y hogar | WooCommerce — Store API pública |
| Outlet de Aseo | Mayoristas, Casa y hogar | Jumpseller — HTML público |

### Tecnología (8)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Alltec | Tecnología, Oficina | PrestaShop — HTML público |
| Chile PC | Tecnología | WooCommerce — Store API pública |
| Cintegral | Tecnología | WooCommerce — Store API pública |
| Notebook Store | Tecnología, Oficina | Jumpseller — HTML público |
| CompuElite | Tecnología | Jumpseller — HTML público |
| Central Gamer | Tecnología | WooCommerce — Store API pública |
| Trulu Store | Tecnología | WooCommerce — Store API pública |
| Xtreme Components | Tecnología | WooCommerce — Store API pública |

### Mascotas (8)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| B-Pets | Mascotas | Shopify — Predictive Search público |
| PetHome | Mascotas | Shopify — Predictive Search público |
| Maxi Mascotas | Mascotas | Shopify — Predictive Search público |
| Patitas de Mía | Mascotas | WooCommerce — Store API pública |
| Animaladas | Mascotas | WooCommerce — Store API pública |
| BokaPets | Mascotas | WooCommerce — Store API pública |
| Todo Para Su Mascota | Mascotas | Jumpseller — HTML público |
| Petco Chile | Mascotas | SAP Commerce — HTML público deduplicado |

### Supermercados (5)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Jumbo | Supermercado | Schema.org ItemList con oferta pública |
| Líder | Supermercado | Schema.org ItemList con oferta pública |
| Santa Isabel | Supermercado | Datos públicos de la vitrina Cencosud |
| Tottus | Supermercado | Datos públicos de la página Next.js |
| Apishop | Supermercado, Casa y hogar | Shopify — Predictive Search público |

### Mayoristas y distribuidores (8)

| Fuente | Áreas | Integración validada |
| --- | --- | --- |
| Alimentika | Mayoristas | WooCommerce — Store API pública |
| Distribuidora Santiago | Mayoristas | WooCommerce — Store API pública |
| MiniMayorista | Mayoristas | WooCommerce — Store API pública |
| Distribuidora Online | Mayoristas | WooCommerce — Store API pública |
| Fermarket | Mayoristas | Jumpseller — HTML público |
| RGC Distribución | Mayoristas, Casa y hogar | WooCommerce — Store API pública |
| Aseo por Mayor | Mayoristas, Casa y hogar | WooCommerce — Store API pública |
| Outlet de Aseo | Mayoristas, Casa y hogar | Jumpseller — HTML público |

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
| Oficina | 34 |
| Casa y hogar | 24 |
| Tecnología | 13 |
| Educación | 25 |
| Supermercado | 5 |
| Mayoristas | 8 |
| Mascotas | 8 |

## Fuera de alcance

No se integraron sitios que exigían tienda física para mostrar precios,
devolvían 401/403, usaban desafíos anti-bot (Cloudflare, PerimeterX, Akamai) o
no producían resultados con precio de forma repetible. Esto incluye a los
grandes retailers: Falabella, Paris, Ripley, Sodimac, Easy, Unimarc, Alvi,
Dimerc, PC Factory y SP Digital, entre otros.

También quedaron fuera catálogos de marca sin precio publicado (proarte.cl) y
sitios cuyo WooCommerce no expone la Store API (artel.cl, officepro.cl,
embalados.cl, tiendaferretera.cl).

MercadoLibre queda declarado pero no disponible: su API exige acceso autorizado.
Prisa, igual: muestra "Iniciar sesión y ver precios" en vez del precio (se
despublicó el 30 de septiembre de 2026; el scraper sigue en `app/providers/prisa.py`).

## Límites de tasa

Shopify aplica un límite **por IP** sobre `/search/suggest.json`. Como 23 de las
fuentes publicadas corren sobre Shopify y el backend sale por una sola IP, al
excederlo **caen todas juntas** con 429. Se observó al correr el validador
completo varias veces seguidas; el bloqueo dura del orden de 5 a 10 minutos y se
levanta solo.

Mitigaciones ya aplicadas:

- `_get()` en `structured_stores.py` reintenta una vez ante 429/503, respetando
  `Retry-After`. Sirve para un 429 aislado, no para un bloqueo sostenido.
- `scripts/validate_sources.py` corre con concurrencia 4 y espera 5 s entre
  intentos, para no gatillar el límite contra sí mismo.

- `quote_multi_providers()` cachea `(fuente, consulta)` por 10 minutos
  (`CACHE_TTL_SECONDS` en `multi_provider.py`). Las listas escolares repiten
  mucho las mismas consultas, así que baja el volumen de forma significativa.
  Los errores no se cachean.

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

## Hallazgos de QA (29 de septiembre de 2026)

Se probaron en vivo 42 fuentes, desde un navegador, con consultas reales de
cada área ("cuaderno universitario 100 hojas", "estuches", "martillo",
"arroz 1 kg", "alimento perro adulto", etc.). Correcciones aplicadas:

- **Dimeiggs**: el precio se buscaba con `FT=<sku>`, que VTEX ignora; todos los
  productos quedaban con el precio del primer resultado genérico ($320). Ahora
  el precio y el stock salen de la misma respuesta de sugerencias.
- **WooCommerce y otras búsquedas literales** devuelven cero con cifras o
  plurales ("cuaderno universitario 100 hojas", "estuches"). El orquestador
  reintenta con consultas simplificadas (`relevance.simplified_queries`) y sigue
  midiendo la relevancia contra la consulta original; esos resultados deben
  cubrir todas las palabras de producto. Shopify no se reintenta.
- **Construplaza** migró de Magento a VTEX (el buscador viejo daba 404).
- **La Secretaria** migró a Laravel + Inertia (el HTML ya no trae `<article>`).
- **Pronobel** corre sobre Shopify; el scraper HTML propio ya no encontraba nada.
- **ArteMania**: el buscador vive en `/busqueda` y la página pinta destacados
  con la misma clase que los resultados; se lee solo `#js-product-list`.
- **Librería Olímpica**: se tomaba el precio "Por mayor" en vez del unitario.
- **Casa Royal**: el HTML no traía resultados para consultas de varias palabras.
- Títulos recortados por la vitrina ("Cuaderno Universitario Frozen 100..") se
  reemplazan por el título completo del atributo `title`/`alt`.

Observaciones que no son errores del parser, pero conviene conocer:

- **Antártica** es una librería de libros: para útiles solo aparecen títulos de
  libros ("La Rebelión de los Lápices de Colores"). Candidata natural para
  cotizar los ítems de lectura, que hoy se excluyen.
- **ElCuaderno** vende insumos de sublimación y manualidades, no útiles: su
  búsqueda devuelve papel fotográfico para "cuaderno universitario".
- **Alltec** marca la mayoría de su catálogo como "Fuera de stock".
- **Mayoristas** (Alimentika y otros) publican precios por caja o pallet; el
  total de una línea no es comparable con el precio unitario de un supermercado.
- **TecnoÚtiles**, **Prido** y **Euromob** tienen catálogos acotados (mobiliario
  en los dos últimos): es normal que no aparezcan para insumos.
- No se pudieron probar desde la red usada (la conexión se reseteaba): la
  mayoría de las tiendas Shopify (Siempre Listos, Papelaria, Dibu, Kitchen
  Center, …), Librería Nacional, Tienda Diseñarte, Ferretería Prat, Animaladas,
  Chileferret y Distribuidora Santiago. El parser Shopify sí se validó con
  Pronobel, Apishop, PetHome y Maxitech.
- Alcanzables pero no probadas en esta pasada: Cintegral, Notebook Store,
  CompuElite, Central Gamer, Trulu Store, Xtreme Components, Patitas de Mía,
  MiniMayorista, Distribuidora Online, Fermarket, RGC, Aseo por Mayor, Outlet
  de Aseo, Dimensiona, Llabrés y Prisa. Correr `scripts/validate_sources.py`
  desde un servidor con salida a internet.

## Validación desde producción (30 de septiembre de 2026)

Las 84 fuentes se consultaron contra la API publicada en Render (una fuente
por consulta, con la consulta de control de `scripts/validate_sources.py`).
**73 devolvieron productos con precio.** Las 11 restantes (hoy quedan 83 publicadas):

| Fuente | Resultado | Causa | Acción |
|---|---|---|---|
| Ferretería Prat | 404 | Migró de Magento a Shopify | Movida a `SHOPIFY_STORES` (su `suggest.json` responde con precio y stock). |
| Fasit | sin resultados para "resma" | Titula las resmas "Papel Fotocopia - Carta 500 HJS" | La relevancia trata "fotocopia" como resma. |
| ElCuaderno | sin resultados para "cuaderno" | Vende encuadernación y sublimación | Consulta de control cambiada. |
| Alltec | sin resultados para "monitor" | Vende componentes, no monitores | Consulta de control cambiada. |
| Prisa | sin resultados (19 s) | Exige iniciar sesión para ver precios ("Iniciar sesión y ver precios") | Despublicada. |
| Antártica, Distribuidora Santiago, Aseo por Mayor | 403 | Bloquean la IP de Render (desde un navegador responden) | Sin corrección desde el código. |
| Alimentika | sin respuesta en 20 s | La tienda no responde a Render | Sin corrección; deja de ser la fuente recomendada de Mayoristas. |
| Chileferret | 500 | Error del servidor de la tienda (también en su `robots.txt`) | Sin corrección. |
| Home Online | 404 en `suggest.json` | No verificable desde la red de pruebas | Pendiente. |

Resultados publicados que no correspondían al producto, corregidos en
`relevance.py`:

- "macbook pro" → "Estuche Pro Mujer" (Dimeiggs): "pro", "mini", "gamer",
  colores y tamaños ya no cuentan como palabra de producto.
- "arroz" → "Galletas de Arroz" ($450, Fermarket) y "Pasta de Arroz".
- "monitor" → "Soporte TV Pantalla Monitor" (Maxitech) y "Brazo soporte monitor"
  (Trulu); "cuaderno" → "Forro cuaderno" (Librería Nené): un título que empieza
  por un accesorio ya no se cotiza como el producto.
