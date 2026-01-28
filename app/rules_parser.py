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

# Palabras clave que indican que NO es un útil escolar válido
INVALID_KEYWORDS = {
    "cuota", "cuotas", "pago", "pagos", "sin interés", "sin interes",
    "horario", "horarios", "hrs", "horas", "hora",
    "disponible", "disponibilidad", "stock",
    "promoción", "promocion", "oferta",
    "tal como", "como", "según", "segun",
    "recomendado", "sugerido", "opcional",
    "abiertos", "cerrados", "cerrado",
    "covid", "sanitario",
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

def is_valid_item(item: Dict[str, Any]) -> bool:
    """
    Valida si un item extraído es realmente un útil escolar válido.
    Filtra items que contienen palabras clave inválidas o patrones extraños.
    """
    detalle = (item.get("detalle") or "").strip().upper()
    original = (item.get("item_original") or "").strip().upper()
    
    # Revisar si contiene palabras clave inválidas
    for bad_keyword in INVALID_KEYWORDS:
        if bad_keyword.upper() in detalle or bad_keyword.upper() in original:
            return False
    
    # Debe tener al menos 2 caracteres y un mínimo de sentido
    if len(detalle) < 2:
        return False
    
    # Si no tiene cantidad (None), probablemente no es un item válido
    if item.get("cantidad") is None:
        return False
    
    # Evitar líneas que parecen ser comentarios o información adicional
    # (demasiado cortas o demasiado largas, sin palabras de útiles típicos)
    if len(detalle) > 150:  # línea demasiado larga, probablemente mezclada
        return False
    
    # Patrones que sugieren que es información, no un item
    if re.search(r"^\d{1,2}:\d{2}\s+(hrs|horas)", detalle):
        return False
    
    if re.search(r"(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)", detalle, re.IGNORECASE):
        return False
    
    return True

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
        # Validar que sea un item válido
        if not is_valid_item(it):
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

def split_comma_items(line: str) -> List[str]:
    """
    Detecta si una línea tiene múltiples items separados por comas.
    Ejemplo: "1 Cuaderno 7mm, 1 Diccionario" → ["1 Cuaderno 7mm", "1 Diccionario"]
    
    Heurística: busca patrones de "N <texto>, N <texto>" donde N es número
    Solo divide si los items están claramente separados por comas y cada uno es válido.
    """
    # Si la línea no tiene comas, devolver como está
    if ',' not in line:
        return [line]
    
    # Buscar patrones: "número espacio+ texto" después de comas
    # Patrón: ", <número>"
    parts = re.split(r',\s+(?=\d\s)', line)
    
    # Si solo hay 1 parte (no encontró el patrón), devolver original
    if len(parts) == 1:
        return [line]
    
    # Verificar que al menos 2 partes tengan cantidad al inicio
    valid_parts = 0
    for part in parts:
        if re.match(r'^\d+\s+', part.strip()):
            valid_parts += 1
    
    # Solo dividir si encontramos al menos 2 items válidos Y no parecen estar mezclados
    if valid_parts >= 2:
        # Validación adicional: verificar que los items después de dividir sean razonables
        split_items = [p.strip() for p in parts if p.strip()]
        # Si algún item es demasiado largo (>100 chars), probablemente está mal mezclado
        if any(len(item) > 100 for item in split_items):
            return [line]  # devolver como está
        return split_items
    
    return [line]

def split_lines(raw_text: str) -> List[str]:
    """
    Divide el texto en líneas limpias.
    Adicionalmente, divide líneas con múltiples items separados por comas.
    """
    lines = [ln for ln in (clean_line(x) for x in raw_text.splitlines()) if ln]
    
    # Segunda pasada: dividir líneas con múltiples items (ej: "1 Cuaderno, 1 Diccionario")
    expanded = []
    for ln in lines:
        sub_items = split_comma_items(ln)
        expanded.extend(sub_items)
    
    return expanded

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

    qty = None
    unit = None
    detail = original
    
    # ========================================================================
    # ESTRATEGIA 1: Cantidad al inicio "N Descripción"
    # ========================================================================
    m_start = re.match(r"^(\d{1,3})\s+(.+)$", original)
    if m_start:
        qty = int(m_start.group(1))
        detail = m_start.group(2).strip()
        unit = "unid"  # default
        
        # Buscar unidad en el detalle: "1 Carpeta caja 5" → unit=caja, qty=5
        m_unit_end = re.search(r"\b(unidades?|uds?|ud|pack|paquete|paq|cajas?|caja|sobres?|sobre|bolsas?|bolsa|pliegos?|pliego|resmas?|resma)\s+(\d{1,3})\s*$",
                               detail, flags=re.IGNORECASE)
        if m_unit_end:
            unit_raw = m_unit_end.group(1).lower()
            qty = int(m_unit_end.group(2))
            unit = UNIT_MAP.get(unit_raw, unit_raw)
            detail = detail[:m_unit_end.start()].strip()
        else:
            # Buscar solo unidad sin cantidad: "1 Caja"
            m_unit_only = re.match(r"^(pack|paquete|paq|cajas?|caja|sobres?|sobre|bolsas?|bolsa|pliegos?|pliego|resmas?|resma)\s+(.*)$",
                                   detail, flags=re.IGNORECASE)
            if m_unit_only:
                unit = UNIT_MAP.get(m_unit_only.group(1).lower(), None) or m_unit_only.group(1).lower()
                detail = m_unit_only.group(2).strip()
            else:
                # Detectar unidad en el texto: "3 Pinceles 2, 6 y 8" → unit basado en contexto
                if re.search(r"\bresma(s)?\b", detail, re.IGNORECASE):
                    unit = "resma"
                elif re.search(r"\bcaja(s)?\b", detail, re.IGNORECASE):
                    unit = "caja"
                elif re.search(r"\bsobre(s)?\b", detail, re.IGNORECASE):
                    unit = "sobre"
        
        return {
            "item_original": original,
            "detalle": detail,
            "cantidad": qty,
            "unidad": unit,
        }
    
    # ========================================================================
    # ESTRATEGIA 2: Unidad al inicio "Pack Separadores ... 1"
    # ========================================================================
    m_unit_start = re.match(r"^(pack|paquete|paq|cajas?|caja|sobres?|sobre|bolsas?|bolsa|pliegos?|pliego|resmas?|resma)\s+(.*)$",
                            original, flags=re.IGNORECASE)
    if m_unit_start:
        unit = UNIT_MAP.get(m_unit_start.group(1).lower(), None) or m_unit_start.group(1).lower()
        detail = m_unit_start.group(2).strip()
        
        # Buscar cantidad al final: "Pack Separadores 5"
        m_qty = re.search(r"(\d{1,3})\s*$", detail)
        if m_qty:
            qty = int(m_qty.group(1))
            detail = detail[:m_qty.start()].strip()
        
        return {
            "item_original": original,
            "detalle": detail,
            "cantidad": qty,
            "unidad": unit,
        }
    
    # ========================================================================
    # ESTRATEGIA 3: Cantidad al final "... 10"
    # ========================================================================
    m_end = re.search(r"\b(unidades?|uds?|ud|pack|paquete|paq|cajas?|caja|sobres?|sobre|bolsas?|bolsa|pliegos?|pliego|resmas?|resma)\s+(\d{1,3})\s*$",
                      original, flags=re.IGNORECASE)
    if m_end:
        unit_raw = m_end.group(1).lower()
        qty = int(m_end.group(2))
        unit = UNIT_MAP.get(unit_raw, unit_raw)
        detail = original[:m_end.start()].strip()
        
        return {
            "item_original": original,
            "detalle": detail,
            "cantidad": qty,
            "unidad": unit,
        }
    
    # ========================================================================
    # ESTRATEGIA 4: Solo cantidad al final "... 10"
    # ========================================================================
    m_qty_only = re.search(r"(\d{1,3})\s*$", original)
    if m_qty_only:
        qty = int(m_qty_only.group(1))
        unit = "unid"
        detail = original[:m_qty_only.start()].strip()
        
        return {
            "item_original": original,
            "detalle": detail,
            "cantidad": qty,
            "unidad": unit,
        }
    
    # No encontró patrón de cantidad
    return None

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
