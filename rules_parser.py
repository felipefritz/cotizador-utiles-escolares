import re
from typing import List, Dict, Any, Optional

KNOWN_SUBJECTS = {
    "LENGUAJE",
    "MATEMÁTICA",
    "MATEMATICA",
    "INGLÉS",
    "INGLES",
    "CIENCIAS",
    "SOCIALES",
    "NATURALES",
    "TECNOLOGÍA",
    "TECNOLOGIA",
    "ARTE",
    "ARTE Y",
    "MÚSICA",
    "MUSICA",
    "TERAPIA",
    "OCUPACIONAL",
    "MATERIALES",
    "DE ASEO",
    "PARA USO",
    "PERSONAL",
}

UNIT_MAP = {
    "unidad": "unid", "unidades": "unid", "unid": "unid", "uds": "unid", "ud": "unid",
    "pack": "pack", "paquete": "pack", "paq": "pack",
    "caja": "caja", "cajas": "caja",
    "sobre": "sobre", "sobres": "sobre",
    "bolsa": "bolsa", "bolsas": "bolsa",
    "pliego": "pliego", "pliegos": "pliego",
    "resma": "resma", "resmas": "resma",
    "frasco": None, "frascos": None,  # si quieres agregar "frasco" como unidad, agrégalo al esquema
}

SECTION_WORDS = {
    "LENGUAJE", "MATEMÁTICA", "MATEMATICA", "INGLÉS", "INGLES",
    "CIENCIAS", "SOCIALES", "NATURALES",
    "ARTE Y", "TECNOLOGÍA", "TECNOLOGIA", "MÚSICA", "MUSICA",
    "TERAPIA", "OCUPACIONAL",
    "MATERIALES", "PARA USO", "PERSONAL", "DE ASEO",
}

HEADER_PATTERNS = [
    r"^LISTA DE ÚTILES",
    r"^\d+º\s+BÁSICO",
    r"^ASIGNATURA\s+ARTÍCULO",
]
import re

BAD_TITLES = {"PERSONAL", "DE ASEO", "PARA USO", "OCUPACIONAL"}

def drop_title_rows(items):
    cleaned = []
    for it in items:
        det = (it.get("detalle") or "").strip().upper()
        if det in BAD_TITLES:
            continue
        # líneas vacías
        if not (it.get("detalle") or "").strip():
            continue
        # todo mayúsculas y sin cantidad => probablemente título
        if it.get("cantidad") is None and re.fullmatch(r"[A-ZÁÉÍÓÚÑ\s]{3,}", det):
            continue
        cleaned.append(it)
    return cleaned



def clean_line(line: str) -> str:
    line = line.strip()
    if not line:
        return ""
    line = re.sub(r"^\(?\s*\d{1,3}\s*[\)\.\-:]\s*", "", line)
    line = re.sub(r"\s+", " ", line)
    return line.strip()

def split_lines(raw_text: str) -> List[str]:
    return [ln for ln in (clean_line(x) for x in raw_text.splitlines()) if ln]

def is_header(line: str) -> bool:
    up = re.sub(r"\s+", " ", line.strip().upper())
    return any(re.match(p, up) for p in HEADER_PATTERNS)

def section_only(line: str) -> Optional[str]:
    up = re.sub(r"\s+", " ", line.strip().upper())
    if up in SECTION_WORDS:
        return up
    return None

def parse_item_line(line: str) -> Optional[Dict[str, Any]]:
    original = line.strip()
    if not original or is_header(original):
        return None

    # unidad al inicio: "Pack Separadores ... 1"
    m0 = re.match(r"^(pack|paquete|paq|caja|cajas|sobre|sobres|bolsa|bolsas|pliego|pliegos|resma|resmas)\s+(.*)$",
                  original, flags=re.IGNORECASE)
    unit_from_start = None
    rest = original
    if m0:
        unit_from_start = UNIT_MAP.get(m0.group(1).lower(), None) or m0.group(1).lower()
        rest = m0.group(2).strip()

    qty = None
    unit = unit_from_start
    detail = rest

    # unidad + cantidad al final: "... Caja 2"
    m = re.search(r"\b(unidades?|uds?|ud|pack|paquete|paq|cajas?|caja|sobres?|sobre|bolsas?|bolsa|pliegos?|pliego|resmas?|resma)\s+(\d{1,3})\s*$",
                  rest, flags=re.IGNORECASE)
    if m:
        unit_raw = m.group(1).lower()
        qty = int(m.group(2))
        unit = UNIT_MAP.get(unit_raw, unit_raw)
        detail = rest[:m.start()].strip()
    else:
        # cantidad al final: "... 10"
        m2 = re.search(r"(\d{1,3})\s*$", rest)
        if m2:
            qty = int(m2.group(1))
            unit = unit or "unid"
            detail = rest[:m2.start()].strip()

    # Ajustes: si en el detalle aparece "caja/resma/sobre" y unidad quedó unid
    if unit == "unid":
        if re.search(r"\bresma(s)?\b", rest, re.IGNORECASE):
            unit = "resma"
        elif re.search(r"\bcaja(s)?\b", rest, re.IGNORECASE):
            unit = "caja"
        elif re.search(r"\bsobre(s)?\b", rest, re.IGNORECASE):
            unit = "sobre"

    if not detail:
        detail = rest

    return {
        "item_original": original,
        "detalle": detail,
        "cantidad": qty,
        "unidad": unit,
    }

def merge_loose_continuations(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged = []
    for it in items:
        is_one_word = it["detalle"] and len(it["detalle"].split()) == 1
        if it["cantidad"] is None and it["unidad"] is None and is_one_word and merged:
            merged[-1]["detalle"] = (merged[-1]["detalle"] + " " + it["detalle"]).strip()
            merged[-1]["item_original"] = (merged[-1]["item_original"] + " " + it["item_original"]).strip()
        else:
            merged.append(it)
    return merged

def parse_with_rules(lines: List[str]) -> Dict[str, Any]:
    items = []
    current_subject = None

    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue

        # A) asignatura en línea sola (SOCIALES, NATURALES, TECNOLOGÍA...)
        sec = section_only(ln)
        if sec:
            current_subject = sec
            continue

        # B) asignatura pegada al item ("LENGUAJE Carpeta ... 1")
        subj, rest = split_subject_prefix(ln)
        if subj:
            current_subject = subj
            ln = rest

        # C) parse item normal
        it = parse_item_line(ln)
        if not it:
            continue

        it["asignatura"] = current_subject
        items.append(it)

    # post-procesos
    items = merge_loose_continuations(items)
    items = drop_title_rows(items)


    return {"curso": None, "items": items}

def find_dubious_lines(parsed: Dict[str, Any]) -> List[str]:
    # manda a IA solo lo dudoso
    dub = []
    for it in parsed["items"]:
        if (it.get("cantidad") is None) or (not it.get("detalle")):
            dub.append(it["item_original"])
    return dub


import re

def split_subject_prefix(line: str):
    s = line.strip()

    # match: "ASIGNATURA <resto>"
    m = re.match(r"^([A-ZÁÉÍÓÚÑ ]{3,})\s+(.+)$", s)
    if not m:
        return None, s

    maybe_subject = m.group(1).strip()
    rest = m.group(2).strip()

    # Normaliza dobles espacios
    maybe_subject = re.sub(r"\s+", " ", maybe_subject)

    # Si el prefijo es una asignatura conocida, la separamos
    if maybe_subject in KNOWN_SUBJECTS:
        return maybe_subject, rest

    return None, s
