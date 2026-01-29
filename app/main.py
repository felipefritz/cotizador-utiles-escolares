from pathlib import Path
from uuid import uuid4
import re
import traceback
import os
from typing import Any, Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from datetime import datetime
# Cargar variables de entorno
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Request, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Imports locales de app/
from app.extractors import extract_text
from app.rules_parser import split_lines, parse_with_rules, find_dubious_lines
from app.llm_client import call_llm_fix, call_llm_full_extraction, call_llm_with_vision
from app.schemas import ParsedList, ParsedItem

from app.quoting.dimeiggs_quote import quote_dimeiggs
from app.quoting.multi_provider import quote_multi_providers

# Autenticación
from app.database import get_db, init_db, User, SessionLocal
from app.auth import get_current_user, get_current_user_optional, create_access_token, get_or_create_user
from app.oauth_providers import get_google_user_info, get_twitter_user_info, get_github_user_info

# Resend para envío de correos
import resend


# ============ MODELOS PYDANTIC ============

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class CheckoutRequest(BaseModel):
    plan_id: int


app = FastAPI(title="Parser Útiles (Reglas + IA + Cotización)")

# Crear router con prefijo /api
api_router = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Inicializar base de datos al iniciar la aplicación"""
    try:
        print("🔧 Initializing database...")
        init_db()
        print("✅ Database initialized successfully")
        print(f"🌐 Server ready to accept connections")
        print(f"💚 Health endpoint available at /health")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        raise


@app.get("/")
async def root():
    """Endpoint raíz"""
    print("📍 Root endpoint called")
    return {"message": "Cotizador Útiles API", "status": "online"}


@app.get("/health")
async def health():
    """Health check endpoint para Railway/Render - Responde con 200 OK"""
    print("💚 Health check called")
    return JSONResponse(
        status_code=200,
        content={"status": "healthy", "service": "cotizador-utiles"}
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc
    tb = traceback.format_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "traceback": tb,
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Permite todos los subdominios de Vercel
    allow_origins=[
        # Desarrollo local
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://127.0.0.1:3000",
        # Railway healthcheck
        "http://healthcheck.railway.app",
        "https://healthcheck.railway.app",
        "healthcheck.railway.app"
        # Agrega tu dominio custom de Vercel aquí si quieres ser específico
        # "https://cotizador-utiles.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

VALID_UNITS = {"unid", "caja", "sobre", "pliego", "bolsa", "resma", "pack"}

SUBJECT_ALIASES = {
    "CIENCIAS NATURALES": "NATURALES",
    "HISTORIA": "SOCIALES",
    "ARTE Y": "ARTE Y TECNOLOGÍA",
}


def _clean_subject(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    s2 = s.strip().upper()
    s2 = re.sub(r"\s+", " ", s2)
    return SUBJECT_ALIASES.get(s2, s2)


def _looks_like_book(item: Dict[str, Any]) -> bool:
    text = f"{item.get('item_original','')} {item.get('detalle','')}".lower()
    return ("lectura" in text) or ("lecturas complementarias" in text) or (" - " in item.get("item_original", ""))


def normalize_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    current_subject: Optional[str] = None

    for it in items:
        it = dict(it)  # copia
        
        # Asegurar que item_original existe (puede faltar si viene del LLM)
        if not it.get("item_original"):
            it["item_original"] = it.get("detalle", "sin detalle")
        
        it["asignatura"] = _clean_subject(it.get("asignatura"))

        # heredar asignatura
        if it["asignatura"]:
            current_subject = it["asignatura"]
        else:
            it["asignatura"] = current_subject

        # normaliza unidad
        u = it.get("unidad")
        if isinstance(u, str):
            u = u.strip().lower()
        if u not in VALID_UNITS:
            it["unidad"] = None
        else:
            it["unidad"] = u

        # libros/lecturas
        if _looks_like_book(it):
            it["tipo"] = "lectura"
            if it.get("cantidad") is None:
                it["cantidad"] = 1
            it["unidad"] = None
            if not it.get("asignatura"):
                it["asignatura"] = "LENGUAJE"
        else:
            it.setdefault("tipo", "util")

        out.append(it)

    return out


def should_quote_item(it: ParsedItem) -> bool:
    """
    Decide qué cosas cotizar.
    - Por defecto: NO cotiza lecturas/libros.
    - Cotiza solo si hay detalle.
    """
    if not it.detalle:
        return False
    # si tu schema ParsedItem no tiene campo tipo, comenta esto
    if getattr(it, "tipo", None) == "lectura":
        return False
    return True


def _quote_single_item(
    item_dict: Dict[str, Any],
    providers: List[str],
) -> Dict[str, Any]:
    """
    Cotiza un item individual en múltiples proveedores.
    Se ejecuta en paralelo vía ThreadPoolExecutor.
    """
    qty = int(item_dict.get("cantidad") or 1)
    
    if item_dict.get("tipo") == "lectura":
        item_dict["quote"] = {"status": "skip", "reason": "lectura/libro"}
        return item_dict

    query = (item_dict.get("detalle") or "").strip()
    if not query:
        item_dict["quote"] = {"status": "not_found", "reason": "Sin detalle"}
        return item_dict

    try:
        # Busca en múltiples proveedores
        q = quote_multi_providers(
            query,
            providers=providers,
            limit_per_provider=5,
            max_results=8,
        )
        
        item_dict["quote"] = q

        # Si encuentra hits, usa el primero (mejor relevancia/precio)
        if q.get("status") in ("ok", "partial") and q.get("hits"):
            best_hit = q["hits"][0]
            if best_hit.get("price"):
                unit_price = best_hit["price"]
                line_total = unit_price * qty
                item_dict["quote"]["unit_price"] = unit_price
                item_dict["quote"]["line_total"] = line_total
                item_dict["quote"]["best_hit"] = best_hit
    except Exception as e:
        item_dict["quote"] = {
            "status": "error",
            "reason": f"Error: {str(e)[:100]}",
        }
    
    return item_dict


# ============ ENDPOINTS DE AUTENTICACIÓN ============

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Obtiene información del usuario actual"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "avatar_url": current_user.avatar_url,
        "provider": current_user.provider,
        "is_admin": current_user.is_admin,
    }


# ============ AUTENTICACIÓN LOCAL (USUARIO/CONTRASEÑA) ============

@api_router.post("/auth/register")
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Registra un nuevo usuario con usuario/contraseña"""
    from app.auth import create_user_local
    
    # Validaciones
    if len(request.username) < 3 or len(request.username) > 20:
        raise HTTPException(400, "El usuario debe tener entre 3 y 20 caracteres")
    if len(request.password) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")
    if "@" not in request.email:
        raise HTTPException(400, "Email inválido")
    
    try:
        user = create_user_local(db, request.username, request.email, request.password)
        token = create_access_token(data={"sub": str(user.id)})
        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "name": user.name,
            }
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@api_router.post("/auth/login")
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login con usuario/contraseña"""
    from app.auth import get_user_by_username, verify_password
    
    user = get_user_by_username(db, request.username)
    if not user or not user.password_hash:
        raise HTTPException(401, "Usuario o contraseña inválidos")
    
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(401, "Usuario o contraseña inválidos")
    
    if not user.is_active:
        raise HTTPException(403, "Usuario inactivo")
    
    # Actualizar último login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    token = create_access_token(data={"sub": str(user.id)})
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "name": user.name,
            "is_admin": user.is_admin,
        }
    }


@api_router.get("/auth/google")
async def google_login():
    """Redirige a Google OAuth"""
    from oauth_providers import GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline"
    )
    return {"url": google_auth_url}


@api_router.get("/auth/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Callback de Google OAuth (GET) - Google redirige aquí con el código"""
    try:
        print(f"[DEBUG] Google callback GET recibido con código: {code[:20]}...")
        
        # El redirect_uri debe ser EXACTAMENTE el mismo que se usó en el GET a Google
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
        
        print(f"[DEBUG] Intercambiando código con redirect_uri: {redirect_uri}")
        
        # Intercambiar código por token
        import httpx
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            print(f"[DEBUG] Token response status: {token_response.status_code}")
            if token_response.status_code != 200:
                print(f"[DEBUG] Error response: {token_response.text}")
                raise Exception(f"Google token error: {token_response.text}")
            
            token_data = token_response.json()
            access_token = token_data["access_token"]
            print(f"[DEBUG] Token obtenido exitosamente")

            # Obtener información del usuario
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_response.raise_for_status()
            user_data = user_response.json()
        
        print(f"[DEBUG] Datos del usuario obtenidos: {user_data.get('email')}")
        
        # Procesar datos del usuario
        email = user_data.get("email")
        name = user_data.get("name")
        picture = user_data.get("picture")
        provider_id = user_data.get("id")
        
        user = get_or_create_user(
            db=db,
            email=email,
            provider="google",
            provider_id=provider_id,
            name=name,
            avatar_url=picture,
        )
        
        from datetime import datetime
        user.last_login = datetime.utcnow()
        db.commit()
        
        jwt_token = create_access_token(data={"sub": str(user.id)})
        print(f"[DEBUG] Usuario autenticado: {user.id}, token JWT creado")
        
        # Redirigir al frontend con el token
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174")
        redirect_url = f"{frontend_url}/auth/callback?token={jwt_token}"
        print(f"[DEBUG] Redirigiendo a: {redirect_url}")
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        print(f"[ERROR] En Google callback: {str(e)}")
        import traceback
        traceback.print_exc()
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174")
        return RedirectResponse(
            url=f"{frontend_url}/login?error=google_auth_failed"
        )


@api_router.get("/auth/github")
async def github_login():
    """Redirige a GitHub OAuth"""
    from oauth_providers import GITHUB_CLIENT_ID, GITHUB_REDIRECT_URI
    github_auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={GITHUB_CLIENT_ID}&"
        f"redirect_uri={GITHUB_REDIRECT_URI}&"
        f"scope=user:email"
    )
    return {"url": github_auth_url}


@api_router.get("/auth/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    """Callback de GitHub OAuth"""
    try:
        user_info = await get_github_user_info(code)
        user = get_or_create_user(
            db=db,
            email=user_info.email,
            provider="github",
            provider_id=user_info.provider_id,
            name=user_info.name,
            avatar_url=user_info.avatar_url,
        )
        
        token = create_access_token(data={"sub": str(user.id)})
        
        frontend_url = "http://localhost:5173"
        return RedirectResponse(url=f"{frontend_url}/auth/callback?token={token}")
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )


@api_router.get("/auth/twitter")
async def twitter_login():
    """Redirige a Twitter/X OAuth"""
    from oauth_providers import TWITTER_CLIENT_ID, TWITTER_REDIRECT_URI
    twitter_auth_url = (
        f"https://twitter.com/i/oauth2/authorize?"
        f"client_id={TWITTER_CLIENT_ID}&"
        f"redirect_uri={TWITTER_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=tweet.read%20users.read&"
        f"state=random_state&"
        f"code_challenge=challenge&"
        f"code_challenge_method=plain"
    )
    return {"url": twitter_auth_url}


@api_router.get("/auth/twitter/callback")
async def twitter_callback(code: str, db: Session = Depends(get_db)):
    """Callback de Twitter/X OAuth"""
    try:
        user_info = await get_twitter_user_info(code)
        user = get_or_create_user(
            db=db,
            email=user_info.email,
            provider="twitter",
            provider_id=user_info.provider_id,
            name=user_info.name,
            avatar_url=user_info.avatar_url,
        )
        
        token = create_access_token(data={"sub": str(user.id)})
        
        frontend_url = "http://localhost:5173"
        return RedirectResponse(url=f"{frontend_url}/auth/callback?token={token}")
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )


# ============ ENDPOINTS DE PARSING Y COTIZACIÓN ============

@api_router.post("/parse")
async def parse_only_rules(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in (".pdf", ".docx", ".xlsx", ".xls"):
        raise HTTPException(400, "Formato no soportado.")

    path = UPLOAD_DIR / f"{uuid4().hex}{ext}"
    path.write_bytes(await file.read())

    raw = extract_text(path)
    lines = split_lines(raw)
    parsed = parse_with_rules(lines)

    return JSONResponse({
        "raw_text_preview": raw[:1500],
        "lines_count": len(lines),
        "items": parsed["items"],
    })


@api_router.post("/parse-ai")
async def parse_rules_plus_ai(
    file: UploadFile = File(...),
    quote: bool = True,         # <-- parámetro: si quieres cotizar
    quote_limit: int = 8,       # <-- hits max por búsqueda
):
    ext = Path(file.filename).suffix.lower()
    if ext not in (".pdf", ".docx", ".xlsx", ".xls"):
        raise HTTPException(400, "Formato no soportado.")

    path = UPLOAD_DIR / f"{uuid4().hex}{ext}"
    path.write_bytes(await file.read())

    raw = extract_text(path)
    lines = split_lines(raw)

    # 1) reglas
    parsed = parse_with_rules(lines)

    # 2) mandar solo lo dudoso a IA
    dub_lines = find_dubious_lines(parsed)
    fixed_items: List[Dict[str, Any]] = []
    if dub_lines:
        try:
            fixed = call_llm_fix(dub_lines)  # ParsedList validado con Pydantic
            fixed_items = [it.model_dump() for it in fixed.items]
        except Exception:
            # Si falla IA, no rompas el endpoint: sigue solo con reglas
            fixed_items = []

    # 3) merge: items buenos + fixes
    ok_items: List[Dict[str, Any]] = []
    for it in parsed["items"]:
        if it.get("cantidad") is not None and it.get("detalle"):
            ok_items.append(it)

    merged = ok_items + fixed_items
    merged = normalize_items(merged)

    # 4) salida final validada
    final = ParsedList(
        raw_text_preview=raw[:1500],
        lines_count=len(lines),
        curso=None,
        items=[ParsedItem(**x) for x in merged],
    )
    # 5) cotización Dimeiggs (robusta: nunca rompe el endpoint)
    quotes_dimeiggs: List[Dict[str, Any]] = []
    if quote:
        quotes_dimeiggs = []
        for it in final.items:
            if not should_quote_item(it):
                quotes_dimeiggs.append({
                    "item": it.model_dump(),
                    "quote": {
                        "provider": "dimeiggs",
                        "query": it.detalle or "",
                        "status": "SKIPPED",
                        "reason": "Item no cotizable (lectura o sin detalle)",
                        "candidates": [],
                    }
                })
                continue

            q = (it.detalle or "").strip()
            quote_res = quote_dimeiggs(q, limit=quote_limit)
            quotes_dimeiggs.append({"item": it.model_dump(), "quote": quote_res})

    # 6) resumen
    total_items = len(final.items)
    quoted = len(quotes_dimeiggs)
    found = sum(1 for x in quotes_dimeiggs if x.get("quote", {}).get("found") is True)
    from collections import Counter
    status_counts = Counter(x["quote"]["status"] for x in quotes_dimeiggs)
    return JSONResponse({
        "raw_text_preview": raw[:1500],
        "lines_count": len(lines),
        "dubious_sent_to_ai": len(dub_lines),
        "items": [it.model_dump() for it in final.items],
        "quotes_dimeiggs": quotes_dimeiggs,
        "summary": {
            "items_total": total_items,
            "items_sent_to_quote": quoted,
            "items_found_in_dimeiggs": found,
            "items_total": len(final.items),
            "quote_status": dict(status_counts),
        }
    })


@api_router.post("/parse-ai-full")
async def parse_with_ai_only(
    file: UploadFile = File(...),
    use_vision: bool = True,  # Nuevo parámetro para usar visión
    current_user: User = Depends(get_current_user),
):
    """
    Usa IA (LLM) para extraer TODOS los items del archivo.
    No usa el parser de reglas, solo inteligencia artificial.
    Ideal para archivos con formatos complejos o mal estructurados.
    
    Parámetros:
    - use_vision: Si True (por defecto), usa GPT-4 Vision para PDFs (mejor precisión)
                  Si False, usa solo extracción de texto + GPT-4o-mini
    
    Retorna:
    {
        "raw_text_preview": str,
        "extraction_method": "ai_only" | "vision",
        "items": [...],
        "curso": str | null,
        "error": str | null
    }
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in (".pdf", ".docx", ".xlsx", ".xls", ".png", ".jpg", ".jpeg"):
        raise HTTPException(400, "Formato no soportado. Use PDF, DOCX, XLSX, XLS o imágenes (PNG, JPG).")

    path = UPLOAD_DIR / f"{uuid4().hex}{ext}"
    path.write_bytes(await file.read())

    # Intentar usar visión primero si está habilitado y es PDF
    extraction_method = "ai_only"
    ai_result = None
    
    if use_vision and ext == ".pdf":
        try:
            print(f"🔍 Intentando extracción con GPT-4 Vision para {file.filename}...")
            ai_result = call_llm_with_vision(path)
            extraction_method = "vision"
            print(f"✅ Extracción con visión exitosa: {len(ai_result.get('items', []))} items encontrados")
        except Exception as e:
            print(f"⚠️  Visión falló, usando extracción de texto: {e}")
            ai_result = None
    
    # Si visión falló o no está disponible, usar extracción de texto
    if ai_result is None or not ai_result.get("items"):
        try:
            raw = extract_text(path)
        except Exception as e:
            raise HTTPException(500, f"Error al extraer texto: {str(e)}")
        
        if not raw or len(raw.strip()) < 10:
            raise HTTPException(400, "El archivo no contiene texto legible.")

        # Usar IA para extraer todos los items
        try:
            print(f"🤖 Extrayendo con modelo de texto: {file.filename}...")
            ai_result = call_llm_full_extraction(raw)
            print(f"✅ Extracción con texto exitosa: {len(ai_result.get('items', []))} items encontrados")
        except Exception as e:
            raise HTTPException(500, f"Error al procesar con IA: {str(e)}")
    
    # Preview del texto (solo si no usamos visión)
    raw_preview = ""
    if extraction_method == "ai_only":
        try:
            raw = extract_text(path)
            raw_preview = raw[:1500]
        except:
            raw_preview = "(No disponible)"
    
    # Normalizar items
    items = ai_result.get("items", [])
    items = normalize_items(items)
    
    # Validar con Pydantic para asegurar estructura
    try:
        validated_items = [ParsedItem(**it) for it in items]
    except Exception as e:
        raise HTTPException(500, f"Error al validar items: {str(e)}")

    return JSONResponse({
        "raw_text_preview": raw_preview,
        "extraction_method": extraction_method,
        "items": [it.model_dump() for it in validated_items],
        "curso": ai_result.get("curso"),
        "error": ai_result.get("error"),
        "summary": {
            "total_items": len(validated_items),
            "items_with_quantity": sum(1 for it in validated_items if it.cantidad and it.cantidad > 0),
            "items_with_subject": sum(1 for it in validated_items if it.asignatura),
        }
    })


@api_router.post("/parse-ai-items-only")
async def parse_items_without_quote(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Parsea el archivo y devuelve items para que el usuario los edite/seleccione.
    NO hace cotización. El usuario decide qué cotizar después.
    Permite uso sin autenticación (modo demo/gratis).
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in (".pdf", ".docx", ".xlsx", ".xls"):
        raise HTTPException(400, "Formato no soportado.")

    path = UPLOAD_DIR / f"{uuid4().hex}{ext}"
    path.write_bytes(await file.read())

    raw = extract_text(path)
    lines = split_lines(raw)

    # 1) reglas
    parsed = parse_with_rules(lines)

    # 2) mandar solo lo dudoso a IA
    dub_lines = find_dubious_lines(parsed)
    fixed_items: List[Dict[str, Any]] = []
    if dub_lines:
        try:
            fixed = call_llm_fix(dub_lines)
            fixed_items = [it.model_dump() for it in fixed.items]
        except Exception:
            fixed_items = []

    # 3) merge: items buenos + fixes
    ok_items: List[Dict[str, Any]] = []
    for it in parsed["items"]:
        if it.get("cantidad") is not None and it.get("detalle"):
            ok_items.append(it)

    merged = ok_items + fixed_items
    merged = normalize_items(merged)

    # 4) salida final validada (SIN cotización)
    # El frontend maneja el límite de selección en modo demo
    final = ParsedList(
        raw_text_preview=raw[:1500],
        lines_count=len(lines),
        curso=None,
        items=[ParsedItem(**x) for x in merged],
    )
    
    return JSONResponse({
        "raw_text_preview": raw[:1500],
        "lines_count": len(lines),
        "dubious_sent_to_ai": len(dub_lines),
        "items": [it.model_dump() for it in final.items],
        "total_items_found": len(ok_items + fixed_items),
    })


@api_router.post("/quote/dimeiggs")
async def quote_in_dimeiggs(payload: dict = Body(...)):
    query = (payload.get("query") or "").strip()
    if not query:
        raise HTTPException(400, "Falta 'query'.")

    res = quote_dimeiggs(query, limit=8)
    return JSONResponse(res)


@api_router.post("/parse-ai-quote/dimeiggs")
async def parse_ai_and_quote_dimeiggs(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in (".pdf", ".docx", ".xlsx", ".xls"):
        raise HTTPException(400, "Formato no soportado.")

    path = UPLOAD_DIR / f"{uuid4().hex}{ext}"
    path.write_bytes(await file.read())

    raw = extract_text(path)
    lines = split_lines(raw)

    parsed = parse_with_rules(lines)
    dub_lines = find_dubious_lines(parsed)

    fixed_items = []
    llm_error = None
    if dub_lines:
        try:
            fixed = call_llm_fix(dub_lines)
            raw_items = fixed.get("items") if isinstance(fixed, dict) else []
            fixed_items = [x for x in (raw_items or []) if isinstance(x, dict)]
        except Exception as e:
            llm_error = str(e)
            fixed_items = []


    ok_items = [it for it in parsed["items"] if it.get("cantidad") is not None and it.get("detalle")]
    merged = normalize_items(ok_items + fixed_items)

    # valida items (solo items, sin usar ParsedList si tu schema pide preview/count)
    final_items = [ParsedItem(**x).model_dump() for x in merged]

    # ---- COTIZACIÓN ----
    subtotal = 0.0
    priced = 0
    missing = 0
    total_qty = 0

    for it in final_items:
        qty = int(it.get("cantidad") or 1)
        total_qty += qty

        # libros/lecturas no cotizar (opcional)
        if it.get("tipo") == "lectura":
            it["quote"] = {"status": "skip", "reason": "lectura/libro"}
            continue

        query = (it.get("detalle") or "").strip()
        if not query:
            it["quote"] = {"status": "not_found", "reason": "Sin detalle para buscar"}
            missing += 1
            continue

        try:
            q = quote_dimeiggs(query, limit=8)
        except Exception as e:
            it["quote"] = {
                "query": query,
                "status": "error",
                "hits": [],
                "error": str(e),
            }
            missing += 1
            continue

        it["quote"] = q

        if q.get("status") != "ok" or not q.get("hits"):
            missing += 1
            continue

        chosen = pick_best_hit(it.get("detalle") or query, q["hits"])
        if not chosen or not chosen.get("url"):
            it["quote"]["status"] = "no_match"
            it["quote"]["reason"] = "Ningún resultado coincide con el ítem"
            missing += 1
            continue

        try:
            price, image_url = fetch_price_and_image(chosen["url"])
        except Exception as e:
            it["quote"]["status"] = "error"
            it["quote"]["error"] = str(e)
            missing += 1
            continue

        if price is None:
            it["quote"]["status"] = "no_price"
            it["quote"]["reason"] = "No se pudo obtener precio del producto"
            missing += 1
            continue

        it["quote"]["unit_price"] = price
        it["quote"]["line_total"] = price * qty
        it["quote"]["status"] = "ok_with_price"
        if image_url:
            it["quote"]["image_url"] = image_url
        subtotal += price * qty
        priced += 1

    resume = {
        "items_total": len(final_items),
        "items_priced": priced,
        "items_missing": missing,
        "total_items_qty": total_qty,
        "subtotal": int(round(subtotal)),
        "currency": "CLP",
    }

    return JSONResponse({
        "raw_text_preview": raw[:1500],
        "lines_count": len(lines),
        "dubious_sent_to_ai": len(dub_lines),
        "resume": resume,
        "items": final_items,
        'llm_error': llm_error,
    })


@api_router.post("/quote/multi-providers")
async def quote_multi_endpoint(
    payload: dict = Body(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Busca un producto en múltiples proveedores (EN PARALELO - MÁS RÁPIDO).
    
    MODO DEMO (sin auth): Máximo 2 proveedores
    MODO COMPLETO (con auth): Todos los proveedores disponibles
    
    Payload:
    {
        "query": "carpeta azul",
        "providers": ["dimeiggs", "libreria_nacional", "jamila", "coloranimal", "pronobel", "prisa", "lasecretaria"],  # opcional
        "limit_per_provider": 5,  # opcional, default 5
    }
    
    Respuesta: Consolidada, ordenada por relevancia y precio.
    Tiempo aproximado: 1-3 segundos (depende de proveedores)
    """
    try:
        query = (payload.get("query") or "").strip()
        if not query:
            raise HTTPException(400, "Falta 'query'.")

        providers = payload.get("providers")  # None = dimeiggs + libreria_nacional
        limit_per_provider = payload.get("limit_per_provider", 5)

        # MODO DEMO: Limitar a 2 proveedores si no está autenticado
        is_demo_mode = current_user is None
        providers_limited_by_plan = False
        
        if is_demo_mode and providers:
            providers = providers[:2]
            providers_limited_by_plan = True
        elif is_demo_mode:
            providers = ["dimeiggs", "libreria_nacional"]  # Default para demo: solo 2
        else:
            # Usuario autenticado: verificar límites y auto-limitar si es necesario
            from app.payment import get_user_limits
            db = SessionLocal()
            try:
                limits = get_user_limits(current_user.id, db)
                max_providers = limits["max_providers"]
                
                if providers and len(providers) > max_providers:
                    print(f"[INFO] Usuario {current_user.id} solicitó {len(providers)} proveedores, limitado a {max_providers}")
                    providers = providers[:max_providers]
                    providers_limited_by_plan = True
                elif not providers:
                    # Si no especificó proveedores, usar default según plan
                    if max_providers >= 5:
                        providers = ["dimeiggs", "libreria_nacional", "jamila", "coloranimal", "pronobel"][:max_providers]
                    else:
                        providers = ["dimeiggs", "libreria_nacional"][:max_providers]
            finally:
                db.close()
        
        print(f"[DEBUG] quote_multi_endpoint: user={current_user.id if current_user else 'demo'}, query={query}, providers={providers}, limited={providers_limited_by_plan}")

        # Búsqueda paralela - mucho más rápida
        print(f"[DEBUG] Iniciando búsqueda: {query} en {providers}")
        result = quote_multi_providers(
            query,
            providers=providers,
            limit_per_provider=limit_per_provider,
            max_results=15,
        )
        print(f"[DEBUG] Búsqueda completada: {len(result.get('consolidated', []))} resultados")
        
        # Agregar info de modo demo y limitación a la respuesta
        result["is_demo_mode"] = is_demo_mode
        if is_demo_mode:
            result["demo_message"] = "Modo prueba: máximo 2 proveedores. Regístrate para acceso completo."
        
        if providers_limited_by_plan:
            result["was_limited"] = True
            result["limited_message"] = f"Se limitó a {len(providers)} proveedores según tu plan. Actualiza tu plan para acceder a más."

        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error inesperado en quote_multi_endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Error en la búsqueda: {str(e)}")


@api_router.post("/parse-ai-quote/multi-providers")
async def parse_ai_and_quote_multi_providers(
    file: UploadFile = File(...),
    providers: str = "dimeiggs,libreria_nacional,jamila,coloranimal,pronobel,prisa,lasecretaria",  # CSV list
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Parse + AI fix + cotización multi-proveedor en una llamada.
    
    MODO DEMO (sin auth): Máximo 5 productos y 2 proveedores
    MODO COMPLETO (con auth): Sin límites
    
    Query params:
    - providers: CSV de proveedores (e.g., "dimeiggs,libreria_nacional,jamila,coloranimal,pronobel,prisa,lasecretaria")
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in (".pdf", ".docx", ".xlsx", ".xls"):
        raise HTTPException(400, "Formato no soportado.")

    path = UPLOAD_DIR / f"{uuid4().hex}{ext}"
    path.write_bytes(await file.read())

    raw = extract_text(path)
    lines = split_lines(raw)

    parsed = parse_with_rules(lines)
    dub_lines = find_dubious_lines(parsed)

    fixed_items = []
    llm_error = None
    if dub_lines:
        try:
            fixed = call_llm_fix(dub_lines)
            # Manejo robusto: call_llm_fix devuelve dict
            fixed_items = fixed.get("items", []) if isinstance(fixed, dict) else []
        except Exception as e:
            llm_error = str(e)
            fixed_items = []

    ok_items = [it for it in parsed["items"] if it.get("cantidad") is not None and it.get("detalle")]
    merged = normalize_items(ok_items + fixed_items)
    
    # MODO DEMO: Limitar a 5 productos si no está autenticado
    is_demo_mode = current_user is None
    original_item_count = len(merged)
    if is_demo_mode and len(merged) > 5:
        merged = merged[:5]
    
    final_items = [ParsedItem(**x).model_dump() for x in merged]

    # Parse providers
    provider_list = [p.strip().lower() for p in providers.split(",") if p.strip()]
    if not provider_list:
        provider_list = ["dimeiggs", "libreria_nacional", "jamila", "coloranimal", "pronobel", "prisa", "lasecretaria"]
    
    # MODO DEMO: Limitar a 2 proveedores si no está autenticado
    if is_demo_mode:
        provider_list = provider_list[:2]

    # ---- COTIZACIÓN MULTI-PROVEEDOR EN PARALELO ----
    # Usa ThreadPoolExecutor para cotizar múltiples items simultáneamente
    with ThreadPoolExecutor(max_workers=min(4, len(final_items))) as executor:
        # Submit todas las tareas de cotización
        futures = [
            executor.submit(_quote_single_item, item, provider_list)
            for item in final_items
        ]
        # Recolecta resultados a medida que terminan
        final_items = [future.result() for future in futures]

    # Calcula resumen
    subtotal = 0.0
    priced = 0
    missing = 0
    total_qty = 0

    for it in final_items:
        qty = int(it.get("cantidad") or 1)
        total_qty += qty

        q = it.get("quote", {})
        
        if q.get("status") in ("ok", "partial") and q.get("line_total"):
            subtotal += q["line_total"]
            priced += 1
        else:
            missing += 1

    resume = {
        "items_total": len(final_items),
        "items_priced": priced,
        "items_missing": missing,
        "total_items_qty": total_qty,
        "subtotal": int(round(subtotal)),
        "currency": "CLP",
        "providers_used": provider_list,
        "is_demo_mode": is_demo_mode,
    }
    
    # Agregar mensaje de demo si aplica
    if is_demo_mode:
        resume["demo_message"] = "Modo prueba: máximo 5 productos y 2 proveedores. Regístrate para acceso completo."
        resume["demo_items_limit_applied"] = original_item_count > 5
        resume["total_items_found"] = original_item_count

    return JSONResponse({
        "raw_text_preview": raw[:1500],
        "lines_count": len(lines),
        "dubious_sent_to_ai": len(dub_lines),
        "resume": resume,
        "items": final_items,
        "llm_error": llm_error,
    })

# Endpoint para construir URLs de carrito inteligentes
@api_router.post("/cart-urls")
async def get_cart_urls(
    body: Dict[str, Any] = Body(..., example={
        "provider": "dimeiggs",
        "items": [
            {"title": "Cuaderno 100 hojas", "url": "https://...", "quantity": 2},
            {"title": "Lápiz HB", "url": "https://...", "quantity": 5}
        ]
    })
):
    """
    Construye URLs de carrito para cada proveedor.
    La mayoría de tiendas modernas usan JavaScript para carrito, así que 
    abrimos la tienda + copiamos el nombre del primer producto automáticamente.
    """
    provider = body.get("provider", "").lower()
    items = body.get("items", [])
    
    if not provider or not items:
        raise HTTPException(status_code=400, detail="provider y items requeridos")
    
    # URL de carrito para cada proveedor
    urls: Dict[str, str] = {
        "dimeiggs": "https://www.dimeiggs.cl/carrito",
        "libreria_nacional": "https://nacional.cl/carrito",
        "jamila": "https://www.jamila.cl/",
        "coloranimal": "https://www.coloranimal.cl/",
        "pronobel": "https://pronobel.cl/",
        "prisa": "https://www.prisa.cl/",
        "lasecretaria": "https://lasecretaria.cl/",
    }
    
    if provider not in urls:
        raise HTTPException(status_code=400, detail=f"Proveedor no soportado: {provider}")
    
    cart_url = urls[provider]
    
    # Preparar información de items
    items_to_copy = []
    for item in items:
        items_to_copy.append({
            "title": item.get("title", ""),
            "quantity": item.get("quantity", 1),
            "url": item.get("url", "")
        })
    
    return {
        "provider": provider,
        "cart_url": cart_url,
        "items": items_to_copy,
        "first_item_title": items_to_copy[0].get("title", "") if items_to_copy else "",
        "instruction": f"Se abrirá el carrito de {provider}. El primer item ({items_to_copy[0].get('title', '')}) se copiará automáticamente para que lo busques.",
        "auto_add_supported": False  # Las tiendas modernas NO permiten agregar desde URL
    }


# ============ ENDPOINTS DE PLANES Y PAGOS ============

@api_router.get("/plans")
async def get_plans(db: Session = Depends(get_db)):
    """Obtiene lista de planes disponibles"""
    from app.database import Plan
    plans = db.query(Plan).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "billing_cycle": p.billing_cycle,
            "max_items": p.max_items,
            "max_providers": p.max_providers,
            "monthly_limit": p.monthly_limit,
        }
        for p in plans
    ]


@api_router.get("/user/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtiene suscripción actual del usuario"""
    from app.payment import get_user_subscription
    subscription = get_user_subscription(current_user.id, db)
    return subscription or {"status": "free"}


@api_router.get("/user/limits")
async def get_user_plan_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtiene los límites del plan del usuario"""
    from app.payment import get_user_limits, get_user_subscription
    from app.database import SavedQuote
    from datetime import datetime
    
    limits = get_user_limits(current_user.id, db)
    subscription = get_user_subscription(current_user.id, db)
    
    # Contar cotizaciones del mes actual
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    
    quotes_this_month = db.query(SavedQuote).filter(
        SavedQuote.user_id == current_user.id,
        SavedQuote.created_at >= start_of_month,
    ).count()
    
    # Total de cotizaciones del usuario
    total_quotes = db.query(SavedQuote).filter(
        SavedQuote.user_id == current_user.id,
    ).count()
    
    return {
        "plan": subscription.get("plan_name", "free") if subscription else "free",
        "limits": {
            "max_items": limits["max_items"],
            "max_providers": limits["max_providers"],
            "monthly_limit": limits["monthly_limit"],
        },
        "usage": {
            "quotes_this_month": quotes_this_month,
            "total_quotes": total_quotes,
            "monthly_remaining": limits["monthly_limit"] - quotes_this_month if limits["monthly_limit"] else None,
        },
    }


@api_router.post("/payment/checkout")
async def create_checkout(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea un checkout en Mercado Pago
    Body: {"plan_id": 2}
    Retorna: {"preference_id": "...", "checkout_url": "https://checkout.mercadopago.com/..."}
    """
    from app.database import Plan
    from app.payment import create_payment_preference
    import os
    
    # Verificar que Mercado Pago esté configurado
    if not os.getenv("MERCADO_PAGO_ACCESS_TOKEN"):
        raise HTTPException(
            503,
            "Sistema de pagos no disponible. Por favor contacta a soporte."
        )
    
    plan = db.query(Plan).filter(Plan.id == request.plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan no existe")
    
    if plan.name == "free":
        raise HTTPException(400, "No se puede comprar el plan gratuito")
    
    # Crear preferencia con email del usuario
    preference = create_payment_preference(plan, current_user.id, db)
    if not preference:
        raise HTTPException(
            500,
            "Error creando sesión de pago. Por favor intenta de nuevo o contacta a soporte."
        )
    
    return {
        "preference_id": preference.get("id"),
        "checkout_url": preference.get("init_point"),
        "success": True,
    }


@api_router.get("/payment/status")
async def check_payment_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verifica el estado del último pago del usuario
    Útil para saber si el pago fue completado después de volver de Mercado Pago
    """
    from app.database import Payment, PaymentStatus
    
    # Obtener último pago del usuario
    latest_payment = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).first()
    
    if not latest_payment:
        return {
            "has_payment": False,
            "status": "no_payment",
            "message": "No hay pagos registrados"
        }
    
    return {
        "has_payment": True,
        "status": latest_payment.status.value,
        "plan_id": latest_payment.plan_id,
        "amount": latest_payment.amount,
        "created_at": latest_payment.created_at.isoformat(),
        "is_completed": latest_payment.status == PaymentStatus.completed,
        "message": {
            PaymentStatus.pending: "Pago pendiente - Mercado Pago está procesando",
            PaymentStatus.completed: "✅ Pago completado! Tu plan ha sido actualizado",
            PaymentStatus.failed: "❌ Pago rechazado - Intenta de nuevo",
            PaymentStatus.cancelled: "Pago cancelado",
        }.get(latest_payment.status, "Estado desconocido")
    }


@api_router.post("/payment/webhook")
async def payment_webhook(body: dict = Body(...), db: Session = Depends(get_db)):
    """
    Webhook de Mercado Pago
    Se llama cuando hay cambios en los pagos
    """
    from app.payment import process_webhook
    
    success = process_webhook(body, db)
    return {"success": success}


@api_router.get("/user/quotes")
async def get_user_quotes(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtiene historial de cotizaciones del usuario"""
    from app.database import SavedQuote
    
    quotes = db.query(SavedQuote).filter(
        SavedQuote.user_id == current_user.id
    ).order_by(SavedQuote.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for q in quotes:
        # Contar items correctamente (puede ser lista o diccionario JSON)
        items_count = 0
        if q.items:
            if isinstance(q.items, list):
                items_count = len(q.items)
            elif isinstance(q.items, dict):
                items_count = len(q.items)
        
        print(f"[DEBUG] Quote {q.id} ({q.title}): items={q.items}, count={items_count}")
        
        result.append({
            "id": q.id,
            "title": q.title,
            "raw_text": q.raw_text[:200],  # Preview
            "items_count": items_count,
            "is_favorite": q.is_favorite,
            "status": q.status,
            "purchased_items": q.purchased_items,
            "created_at": q.created_at.isoformat(),
            "updated_at": q.updated_at.isoformat(),
        })
    
    return result


@api_router.get("/user/quotes/{quote_id}")
async def get_quote_detail(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtiene detalle de una cotización guardada"""
    from app.database import SavedQuote
    
    quote = db.query(SavedQuote).filter(
        SavedQuote.id == quote_id,
        SavedQuote.user_id == current_user.id,
    ).first()
    
    if not quote:
        raise HTTPException(404, "Cotización no encontrada")
    
    return {
        "id": quote.id,
        "title": quote.title,
        "raw_text": quote.raw_text,
        "items": quote.items,
        "results": quote.results,
        "notes": quote.notes,
        "purchased_items": quote.purchased_items,
        "selected_provider": quote.selected_provider,
        "is_favorite": quote.is_favorite,
        "status": quote.status,
        "created_at": quote.created_at.isoformat(),
        "updated_at": quote.updated_at.isoformat(),
    }


@api_router.post("/user/quotes")
async def save_quote(
    title: str = Body(...),
    raw_text: str = Body(...),
    items: list = Body(...),
    results: dict = Body(None),
    notes: str = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Guarda una cotización - Auto-limita según plan del usuario"""
    from app.database import SavedQuote
    from app.payment import get_user_limits
    
    # Validar que haya al menos 1 item
    if not items:
        raise HTTPException(400, "La cotización debe tener al menos 1 item")
    
    # Obtener límites del usuario
    limits = get_user_limits(current_user.id, db)
    max_items = limits["max_items"]
    
    # Auto-limitar items si es necesario
    items_original_count = len(items)
    if len(items) > max_items:
        print(f"[INFO] Usuario {current_user.id} envió {len(items)} items, limitado a {max_items}")
        items = items[:max_items]
        was_limited_items = True
    else:
        was_limited_items = False
    
    # Contar providers únicos en los resultados
    providers_count = 0
    if results:
        providers_count = len(set([item.get('provider') for item in results.values() if item.get('provider')]))
        providers_count = max(1, providers_count)  # Al menos 1 proveedor
    
    # Auto-limitar proveedores si es necesario
    max_providers = limits["max_providers"]
    was_limited_providers = False
    if providers_count > max_providers:
        print(f"[INFO] Usuario {current_user.id} envió {providers_count} proveedores, limitado a {max_providers}")
        was_limited_providers = True
        # Truncar results a solo los primeros N proveedores
        if results:
            providers_to_keep = list(set([item.get('provider') for item in results.values() if item.get('provider')]))[:max_providers]
            results = {k: v for k, v in results.items() if v.get('provider') in providers_to_keep}
    
    # Validar límite mensual
    if limits["monthly_limit"] is not None:
        from datetime import datetime
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1)
        
        quotes_this_month = db.query(SavedQuote).filter(
            SavedQuote.user_id == current_user.id,
            SavedQuote.created_at >= start_of_month,
        ).count()
        
        if quotes_this_month >= limits["monthly_limit"]:
            raise HTTPException(
                429,
                f"Límite de {limits['monthly_limit']} cotizaciones por mes alcanzado. Intenta el próximo mes o actualiza tu plan."
            )
    
    quote = SavedQuote(
        user_id=current_user.id,
        title=title,
        raw_text=raw_text,
        items=items,
        results=results,
        notes=notes,
    )
    db.add(quote)
    db.commit()
    
    response = {
        "id": quote.id,
        "message": "Cotización guardada correctamente",
    }
    
    if was_limited_items or was_limited_providers:
        response["was_limited"] = True
        limitations = []
        if was_limited_items:
            limitations.append(f"items ({items_original_count} → {max_items})")
        if was_limited_providers:
            limitations.append(f"proveedores (→ {max_providers})")
        response["limited_message"] = f"Se limitó la cotización por: {', '.join(limitations)}. Actualiza tu plan para sin limitaciones."
    
    return response


@api_router.put("/user/quotes/{quote_id}")
async def update_quote(
    quote_id: int,
    title: str = Body(None),
    notes: str = Body(None),
    is_favorite: bool = Body(None),
    status: str = Body(None),
    purchased_items: dict = Body(None),
    selected_provider: str = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualiza una cotización guardada"""
    from app.database import SavedQuote
    from datetime import datetime
    quote = db.query(SavedQuote).filter(
        SavedQuote.id == quote_id,
        SavedQuote.user_id == current_user.id,
    ).first()
    
    if not quote:
        raise HTTPException(404, "Cotización no encontrada")
    
    if title is not None:
        quote.title = title
    if notes is not None:
        quote.notes = notes
    if is_favorite is not None:
        quote.is_favorite = is_favorite
    if status is not None:
        quote.status = status
    if purchased_items is not None:
        quote.purchased_items = purchased_items
    if selected_provider is not None:
        quote.selected_provider = selected_provider
    
    quote.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Cotización actualizada"}


@api_router.delete("/user/quotes/{quote_id}")
async def delete_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elimina una cotización"""
    from app.database import SavedQuote
    
    quote = db.query(SavedQuote).filter(
        SavedQuote.id == quote_id,
        SavedQuote.user_id == current_user.id,
    ).first()
    
    if not quote:
        raise HTTPException(404, "Cotización no encontrada")
    
    db.delete(quote)
    db.commit()
    
    return {"message": "Cotización eliminada"}


@api_router.post("/user/quotes/{quote_id}/mark-purchased")
async def mark_items_purchased(
    quote_id: int,
    item_name: str = Body(...),
    provider: str = Body(...),
    price: float = Body(0),
    quantity: int = Body(1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca un item como comprado en una cotización"""
    from app.database import SavedQuote
    
    quote = db.query(SavedQuote).filter(
        SavedQuote.id == quote_id,
        SavedQuote.user_id == current_user.id,
    ).first()
    
    if not quote:
        raise HTTPException(404, "Cotización no encontrada")
    
    if not quote.purchased_items:
        quote.purchased_items = {}
    
    # Crear una copia del diccionario para que SQLAlchemy lo detecte como cambio
    updated_items = quote.purchased_items.copy()
    updated_items[item_name] = {
        "provider": provider,
        "price": float(price) if price is not None else 0,
        "quantity": int(quantity) if quantity is not None else 1,
        "date": datetime.utcnow().isoformat(),
    }
    quote.purchased_items = updated_items
    
    quote.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": f"Item '{item_name}' marcado como comprado",
        "purchased_items": quote.purchased_items,
    }


@api_router.post("/user/quotes/{quote_id}/unmark-purchased")
async def unmark_item_purchased(
    quote_id: int,
    item_name: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Desmarca un item como comprado en una cotización"""
    from app.database import SavedQuote
    
    quote = db.query(SavedQuote).filter(
        SavedQuote.id == quote_id,
        SavedQuote.user_id == current_user.id,
    ).first()
    
    if not quote:
        raise HTTPException(404, "Cotización no encontrada")
    
    if quote.purchased_items and item_name in quote.purchased_items:
        # Crear un nuevo diccionario sin el item para que SQLAlchemy lo detecte
        updated_items = {k: v for k, v in quote.purchased_items.items() if k != item_name}
        quote.purchased_items = updated_items
    
    quote.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": f"Item '{item_name}' desmarcado",
        "purchased_items": quote.purchased_items,
    }


# ============ CONTACTO ============

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str


@app.post("/api/contact")
async def send_contact_email(request: ContactRequest):
    """
    Envía un correo de contacto a felipedelfierro@gmail.com usando Resend
    """
    try:
        resend_api_key = os.getenv("RESEND_API_KEY")
        if not resend_api_key:
            raise HTTPException(500, "RESEND_API_KEY no configurada en variables de entorno")
        
        # Configurar la API key de Resend
        resend.api_key = resend_api_key
        
        # Enviar correo
        email = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": "felipedelfierro@gmail.com",
            "subject": f"Nuevo mensaje de contacto de {request.name}",
            "html": f"""
            <h2>Nuevo mensaje de contacto</h2>
            <p><strong>Nombre:</strong> {request.name}</p>
            <p><strong>Email:</strong> {request.email}</p>
            <h3>Mensaje:</h3>
            <p>{request.message.replace(chr(10), '<br>')}</p>
            """,
        })
        
        return {
            "success": True,
            "message": "Correo enviado exitosamente. Nos pondremos en contacto pronto.",
            "email_id": email.get("id") if isinstance(email, dict) else str(email),
        }
    except Exception as e:
        print(f"Error enviando correo: {e}")
        raise HTTPException(500, f"Error enviando correo: {str(e)}")


# Import admin router
from app.routers.admin import router as admin_router

# Incluir admin router en api_router ANTES de incluir api_router en app
api_router.include_router(admin_router)

# Registrar router con prefijo /api
app.include_router(api_router)
