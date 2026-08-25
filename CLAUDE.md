# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Cotizador de precios para Chile (CLP, sitio MLC, `google.cl`). Nació como cotizador de útiles
escolares y se está generalizando a otros rubros (construcción, hogar, oficina, tecnología) —
ver [docs/ESCALAR_COTIZADOR_GENERAL.md](docs/ESCALAR_COTIZADOR_GENERAL.md), que es la hoja de ruta
vigente de esa expansión.

Backend FastAPI (`app/`) + frontend React/Vite/MUI (`frontend/`). Backend en Railway/Render,
frontend en Vercel. Marca pública: **PrecioFast** (`preciofast.cl`).

## Comandos

Backend (Python 3.12):

```bash
source venv12/bin/activate            # Python 3.12, igual que el Dockerfile y el CI (venv/ es 3.13)
pip install -r requirements.txt
python run.py                         # uvicorn 127.0.0.1:8000 con reload
uvicorn app.main:app --reload         # equivalente
python scripts/init_db.py             # crea tablas + planes por defecto (también corre en startup)
python scripts/update_plans.py        # actualiza límites de planes existentes
python make_admin.py <email>          # marca usuario como admin
python check_plans.py                 # imprime límites actuales de los planes
```

Tests backend — no hay `pytest.ini`; `tests/` tiene un solo test y los `test_*.py` de la raíz son
**scripts ejecutables**, no tests de pytest (hacen requests reales / tocan la BD real):

```bash
pytest tests/                         # suite pytest (mínima)
python tests/test_openai_extraction.py   # verifica config LLM y extracción real
python test_payment_flow.py           # script manual: flujo Mercado Pago contra la BD local
python -c "from app.main import app"   # check de imports; es lo que valida el CI
```

Frontend:

```bash
cd frontend
npm install
npm run dev            # Vite en :5173
npm run build          # tsc -b && vite build
npm run test           # tsc -b && vitest run
npx vitest run src/utils/format.test.ts   # un solo archivo
```

Lint: no hay linter configurado localmente. El CI corre `flake8 app --select=E9,F63,F7,F82`
(`.github/workflows/backend-ci.yml`) y `npm run lint --if-present` (que no existe) en el frontend.
El job de seguridad falla si aparece `sk-proj-` o `gsk_` en cualquier `*.py` o `*.md`: no pegar
API keys reales ni ejemplos con esos prefijos en documentación.

## Arquitectura

### Pipeline de cotización

```
archivo → extractors.py → rules_parser.py → llm_client.py → normalize_items() → quote_multi_providers()
```

1. **`app/extractors.py`** — texto desde PDF (pdfplumber, con caché en disco), DOCX, Excel.
   `app/parser.py` es una versión anterior y duplicada de esto; el código vivo usa `extractors` +
   `rules_parser`.
2. **`app/rules_parser.py`** — parseo determinista línea a línea (cantidad, unidad, detalle,
   asignatura). `find_dubious_lines()` marca lo que las reglas no resolvieron.
3. **`app/llm_client.py`** — Groq (default, gratis) u OpenAI vía `LLM_PROVIDER`. Tres modos:
   `call_llm_fix` (solo las líneas dudosas), `call_llm_full_extraction` (texto completo),
   `call_llm_with_vision` (PDF → imágenes base64). **Groq no tiene visión real**: `/api/parse-ai-full`
   fuerza `use_vision=False` salvo que `LLM_PROVIDER=openai`.
4. **`normalize_items()` en `main.py`** — hereda asignatura entre líneas, valida `unidad` contra
   `VALID_UNITS`, y clasifica libros como `tipo="lectura"`. Los items `lectura` se **excluyen** de la
   cotización (`should_quote_item`, `_quote_single_item`).
5. **`app/quoting/multi_provider.py`** — orquestador.

Los endpoints combinan estos pasos: `/api/parse` (solo reglas), `/api/parse-ai` (reglas + IA sobre
lo dudoso), `/api/parse-ai-full` (solo IA), `/api/parse-ai-items-only`, y los `parse-ai-quote/*` que
parsean y cotizan en una sola llamada.

### Capa de proveedores

Dos familias de fuentes, ambas normalizadas al mismo contrato de *hit*:

- **Scrapers/APIs propias** (`CORE_PROVIDERS` en `app/quoting/provider_registry.py`): mercadolibre,
  dimeiggs, libreria_nacional, jamila, coloranimal, pronobel, prisa, lasecretaria. Siempre activas.
- **Fuentes vía SerpAPI**, activas **solo si `SERPAPI_API_KEY` está seteada**: `web_shopping`
  (Google Shopping amplio) y los retailers de `RETAILERS` en `retail_web_quote.py` (solotodo,
  sodimac, falabella, ripley, pcfactory, paris, lider_web, jumbo_web).

`available_providers()` es la única fuente de verdad de qué fuentes existen, y se expone al frontend
por `GET /api/settings/public` — el frontend pinta como disponibles solo los ids que vengan ahí.

`quote_multi_providers()` lanza todos los proveedores en paralelo (`ThreadPoolExecutor`, máx 10
threads, `timeout=15` por futuro), consolida los hits y los ordena por `relevance` descendente
(`_token_overlap` entre query y título) y luego precio ascendente. Un proveedor que falla se agrega a
`providers_failed` sin romper la respuesta; el `status` global es `ok` / `partial` / `no_results` / `error`.

**Contrato de hit** que toda función de proveedor debe devolver:
`{title, url, price (int CLP | None), available, provider, relevance, image_url, merchant?, sku?}`.

**Para agregar un proveedor hay que tocar 4 lugares:**
1. `app/quoting/<nombre>_quote.py` con `quote_<nombre>(query, limit) -> {query, status, hits, error}`
   (y, si necesita scraping propio, un cliente en `app/providers/<nombre>.py`).
2. Un wrapper `_quote_<nombre>(query, limit) -> (nombre, hits, error)` en `multi_provider.py`,
   registrado en el dict `provider_funcs`.
3. El id en `CORE_PROVIDERS` (o en `SERPAPI_RETAIL_PROVIDERS` + `RETAILERS` si va por SerpAPI).
4. Frontend: el union `SourceId` y el array `SOURCES` en `frontend/src/types.ts`, y el array
   `PROVIDERS` de `frontend/src/components/DemoQuoteModal.tsx`.

Varios módulos de `quoting/` están fuera del registry y solo se alcanzan por nombre explícito
(`jumbo`, `lider`, `lapiz_lopez`) o son versiones duplicadas (`libreria_nacional_quote_v2.py`).
Todo request HTTP externo debe pasar por `request_kwargs()` de `app/quoting/http_utils.py` (resuelve
el bundle de certificados; sin eso falla SSL en macOS).

### Rutas y auth

Todo cuelga de `api_router = APIRouter(prefix="/api")` en `app/main.py`, más `routers/admin.py`
(prefijo `/admin`, o sea `/api/admin/...`). Las excepciones declaradas directo en `app` son `/`,
`/health` (healthcheck de Railway/Render) y `/api/contact`.

- `Depends(get_current_user)` = requiere token; `get_current_user_optional` = endpoint público con
  modo demo.
- **Modo demo**: `/api/quote/multi-providers` sin usuario limita a 2 fuentes y devuelve
  `is_demo_mode` + `demo_message` en la respuesta.
- **Límites por plan**: `get_user_limits()` en `app/payment.py` (`max_items`, `max_providers`,
  `monthly_limit`; `None` = ilimitado). Los endpoints **recortan silenciosamente** la lista de
  proveedores en vez de rechazar, y marcan `was_limited` / `limited_message`.
- **Kill switch global**: el setting `plans_enabled` (tabla `app_settings`, leído con
  `get_setting_bool`) desactiva planes y límites en todo el sistema; cuando está en `false`,
  `/api/plans` devuelve `[]` y todos los usuarios quedan sin restricción.

### Base de datos

SQLAlchemy sin Alembic. `init_db()` corre en el evento `startup`: crea las tablas y siembra los
planes `free`/`basic`/`pro` y el setting `plans_enabled` **solo si la tabla está vacía**. Las
migraciones son scripts sueltos en `scripts/` (ej. `migrate_add_purchase_tracking.py`); cambiar un
modelo sobre una BD existente exige escribir uno.

`DATABASE_URL` default `sqlite:///./cotizador.db`; el prefijo `postgres://` se reescribe a
`postgresql://` automáticamente. Modelos: `User`, `Plan`, `Subscription`, `Payment`, `SavedQuote`
(guarda `items`, `results`, `purchased_items` como JSON), `ProviderSuggestion`, `PageVisit`,
`AppSetting`.

### Frontend

- **Todas** las llamadas HTTP pasan por `frontend/src/api.ts` (y `AuthContext.tsx` /
  `LoginPage.tsx`, que reimplementan el mismo `API_BASE`). No hacer `fetch` inline en componentes.
- `API_BASE = import.meta.env.VITE_API_URL || '/api'`. En dev usar `VITE_API_URL=http://localhost:8000/api`
  (ya está en `frontend/.env.development`): el proxy de `vite.config.ts` reescribe `^/api` a la raíz,
  que **no** coincide con el prefijo real del backend, así que el fallback `/api` no funciona.
- Flujo principal en 4 pasos: `steps/UploadStep` → `ItemsStep` → `SourcesStep` → `QuoteStep`,
  coordinados por `App.tsx`. `SourcesStep` cruza `SOURCES` con `available_providers` y con los
  límites del plan.
- Token JWT en `localStorage` bajo `auth_token`.
- Al cambiar la forma de una respuesta del backend, actualizar los tipos en `api.ts` **y** en
  `types.ts` (ambos declaran tipos de dominio).

## Gotchas

- `app/auth.py` **hardcodea `SECRET_KEY`** (línea 11) en vez de leerlo del entorno, aunque
  `.env.example`, `render.yaml` y la documentación digan lo contrario. Cambiar la variable de entorno
  no tiene efecto sobre los JWT.
- `main.py` abre `SessionLocal()` a mano en algunos handlers (ej. `quote_multi_endpoint`) en vez de
  usar `Depends(get_db)`. Para código nuevo, usar `get_db`.
- Hay un `@app.exception_handler(Exception)` que devuelve el **traceback completo** en el JSON de
  error 500.
- `vercel.json` de la raíz apunta a `https://tu-backend.railway.app` (placeholder); el deploy real
  usa `frontend/vercel.json` con Root Directory `frontend` y `VITE_API_URL` como variable de entorno.
- El `Dockerfile` copia `.env.example` como `.env`, así que la configuración real debe venir de
  variables de entorno de la plataforma, no del archivo.
- La raíz tiene ~25 archivos `*.md` de estado/implementación (ADMIN_*, MERCADO_PAGO_*,
  IMPLEMENTATION_*, etc.) escritos en distintos momentos; muchos están desactualizados. Ante una
  contradicción, el código manda.
- `.github/agents/cotizador.agent.md` describe el proyecto como argentino: es incorrecto, el proyecto
  es chileno (CLP, MLC, `google.cl`).

## Variables de entorno

Backend (`.env` en la raíz): `LLM_PROVIDER` (`groq`|`openai`), `GROQ_API_KEY` / `OPENAI_API_KEY`,
`GROQ_MODEL`, `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_URL`, `BASE_URL`, OAuth de Google/GitHub/Twitter
(`*_CLIENT_ID`, `*_CLIENT_SECRET`, `*_REDIRECT_URI`), `MERCADO_PAGO_ACCESS_TOKEN`,
`MERCADO_PAGO_PUBLIC_KEY`, `RESEND_API_KEY`, y las de fuentes generales: `SERPAPI_API_KEY`,
`SERPAPI_GL`, `SERPAPI_HL`, `SERPAPI_GOOGLE_DOMAIN`, `SERPAPI_LOCATION`, `MERCADOLIBRE_SITE_ID`,
`MERCADOLIBRE_ACCESS_TOKEN`.

Frontend (`frontend/.env.*`): `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_WHATSAPP_NUMBER`.

Nuevos orígenes de producción deben agregarse a la lista de CORS en `app/main.py` (hay un
`allow_origin_regex` que ya cubre `*.vercel.app`).
