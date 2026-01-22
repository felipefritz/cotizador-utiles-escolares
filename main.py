from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from extractors import extract_text
from rules_parser import split_lines, parse_with_rules, find_dubious_lines
from llm_client import call_llm_fix
from schemas import ParsedList, ParsedItem

app = FastAPI(title="Parser Útiles (Reglas + IA)")
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
import re
from typing import Any, Dict, List, Optional

VALID_UNITS = {"unid", "caja", "sobre", "pliego", "bolsa", "resma", "pack"}

# Si quieres normalizar asignaturas:
SUBJECT_ALIASES = {
    "CIENCIAS NATURALES": "NATURALES",
    "HISTORIA": "SOCIALES",
    "ARTE Y": "ARTE Y TECNOLOGÍA",  # opcional
}

def _clean_subject(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    s2 = s.strip().upper()
    s2 = re.sub(r"\s+", " ", s2)
    return SUBJECT_ALIASES.get(s2, s2)

def _looks_like_book(item: Dict[str, Any]) -> bool:
    text = f"{item.get('item_original','')} {item.get('detalle','')}".lower()
    # heurística: títulos con " - Autor" o comillas, o keyword lecturas
    return ("lectura" in text) or ("lecturas complementarias" in text) or (" - " in item.get("item_original",""))

def normalize_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    - Hereda asignatura si viene None.
    - Corrige unidad inválida: None si no está en VALID_UNITS.
    - Para lecturas/libros: setea tipo='lectura', cantidad=1, unidad=None, asignatura='LENGUAJE' si falta.
    """
    out: List[Dict[str, Any]] = []
    current_subject: Optional[str] = None

    for it in items:
        it = dict(it)  # copia
        it["asignatura"] = _clean_subject(it.get("asignatura"))

        # Mantener contexto de asignatura
        if it["asignatura"]:
            current_subject = it.get("asignatura") or current_subject

        else:
            it["asignatura"] = current_subject

        # Normaliza unidad
        u = it.get("unidad")
        if isinstance(u, str):
            u = u.strip().lower()
        if u not in VALID_UNITS:
            it["unidad"] = None
        else:
            it["unidad"] = u

        # Lecturas / libros
        if _looks_like_book(it):
            it["tipo"] = "lectura"
            if it.get("cantidad") is None:
                it["cantidad"] = 1
            it["unidad"] = None
            if not it.get("asignatura"):
                it["asignatura"] = "LENGUAJE"

        out.append(it)

    return out

@app.post("/parse")
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

@app.post("/parse-ai")
async def parse_rules_plus_ai(file: UploadFile = File(...)):
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
    fixed_items = []
    if dub_lines:
        fixed = call_llm_fix(dub_lines)  # ParsedList validado con Pydantic
        fixed_items = [it.model_dump() for it in fixed.items]

    # 3) merge simple: nos quedamos con los items “buenos” y agregamos fixes
    ok_items = []
    for it in parsed["items"]:
        if it.get("cantidad") is not None and it.get("detalle"):
            ok_items.append(it)

    merged = ok_items + fixed_items
    merged = normalize_items(merged)
    # 4) salida final validada
    final = ParsedList(curso=None, items=[ParsedItem(**x) for x in merged])

    return JSONResponse({
        "raw_text_preview": raw[:1500],
        "lines_count": len(lines),
        "dubious_sent_to_ai": len(dub_lines),
        "items": [it.model_dump() for it in final.items],
    })
