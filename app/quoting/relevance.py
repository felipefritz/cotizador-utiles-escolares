"""Relevancia entre lo que pide el usuario y el título que devuelve una tienda.

Este módulo decide qué productos llegan al usuario y en qué orden, así que sus
reglas salen de casos reales observados en las tiendas publicadas:

* Las tiendas abrevian ("100hj", "12col.", "PTA ROMA", "Univ."), así que las
  abreviaturas se expanden y las cifras pegadas a una unidad se separan.
* Los plurales se reducen de forma simétrica: "estuches" y "estuche" (o
  "colores" y "color") terminan en la misma raíz, sin coincidencia difusa.
* Las cifras y las unidades pesan la mitad: "Papel Sublimación A4 100 hojas" no
  es un cuaderno por compartir "100 hojas" con "cuaderno universitario 100
  hojas". Además se exige que coincida al menos una palabra de producto.
* Lo que aparece después de "para" describe un accesorio ("Esponja para
  ollas", "Estuche para cuaderno"): cuenta mucho menos, salvo que la búsqueda
  también lo pida con "para" ("arena para gatos"). Lo mismo cuando el título
  empieza por un accesorio conocido ("Soporte olla", "Forro cuaderno").
"""
from __future__ import annotations

import re
import unicodedata
from typing import Dict, List, Sequence, Set, Tuple


STOPWORDS = {
    "de", "del", "la", "el", "los", "las", "y", "o", "con", "para", "por",
    "un", "una", "pliego", "caja", "unidad", "unidades", "pack", "set",
    "pz", "pzas", "x", "bolsa", "en", "al", "a", "sin", "c", "n", "no", "nro",
}

#: Abreviaturas y sinónimos frecuentes en títulos de tiendas chilenas.
ALIASES: Dict[str, str] = {
    "hj": "hoja", "hjs": "hoja", "hjas": "hoja", "hoj": "hoja", "hh": "hoja",
    "col": "color", "cols": "color",
    "pta": "punta",
    "univ": "universitario",
    "cuad": "cuaderno",
    "huincha": "cinta", "huinchas": "cinta",
    "aisladora": "aislante", "aisladoras": "aislante",
    "auricular": "audifono", "auriculares": "audifono",
    "wireless": "inalambrico",
    "und": "unidad", "unds": "unidad", "unid": "unidad", "uds": "unidad", "ud": "unidad",
    "cms": "cm", "mts": "mt", "grs": "gr", "gramos": "gr", "g": "gr",
    "lts": "lt", "litro": "lt", "litros": "lt", "l": "lt",
    "kilo": "kg", "kilos": "kg", "kgs": "kg",
}

#: Unidades que suelen venir pegadas a una cifra ("100hj", "12col", "500ml").
UNIT_SUFFIXES = {
    "hj", "hjs", "hjas", "hh", "h", "col", "cols", "cm", "cms", "mm", "mt", "mts",
    "m", "gr", "grs", "g", "kg", "kgs", "ml", "lt", "lts", "l", "cc", "oz", "w",
    "v", "gb", "tb", "mah", "u", "und", "un", "unid", "uds", "ud", "pulg", "p",
}

#: Palabras que describen cantidad o medida, no el producto: pesan la mitad.
GENERIC_TOKENS = {"hoja", "color", "cm", "mm", "mt", "gr", "kg", "ml", "lt", "cc", "oz", "unidad"}

#: Peso de una palabra que solo aparece como destino de un accesorio.
ACCESSORY_WEIGHT = 0.35

#: Sustantivos que, al encabezar un título, indican un accesorio o repuesto
#: del producto buscado ("Soporte olla", "Forro cuaderno universitario"). Si
#: la búsqueda no los pide, el puntaje se multiplica por `ACCESSORY_HEAD_FACTOR`:
#: siguen apareciendo, pero debajo del producto real aunque sean más baratos.
ACCESSORY_HEADS = {
    "soporte", "funda", "forro", "repuesto", "recambio", "tapa", "protector",
    "cargador", "adaptador", "correa", "carcasa", "lomo", "separador", "esponja",
    "cepillo", "lana", "organizador", "porta", "etiqueta", "sticker", "cubierta",
    "colgador", "gancho", "limpiador", "mica", "manilla", "asa",
}
ACCESSORY_HEAD_FACTOR = 0.6

#: Umbral mínimo para mostrar un producto (ver `is_relevant`).
MIN_RELEVANCE = 0.4


def normalize_text(value: str) -> str:
    """Minúsculas, sin acentos, solo alfanuméricos y espacios simples."""
    value = (value or "").lower().strip()
    value = "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def canonical_token(word: str) -> str:
    """Raíz simétrica para singular y plural.

    `lapices -> lapiz`, `estuches -> estuch <- estuche`, `colores -> color`,
    `sobres -> sobr <- sobre`. Se aplica igual a la búsqueda y al título, así
    que lo que importa es que ambas formas lleguen a la misma raíz.
    """
    word = ALIASES.get(word, word)
    if len(word) > 4 and word.endswith("ces"):
        return f"{word[:-3]}z"
    if len(word) > 3 and word.endswith("s") and not word.endswith(("is", "us", "ss")):
        word = word[:-1]
    if len(word) > 3 and word.endswith("e") and word[-2] not in "aeiou":
        word = word[:-1]
    return word


#: `ACCESSORY_HEADS` en su raíz canónica ("soporte" -> "soport").
_ACCESSORY_HEAD_ROOTS = {canonical_token(word) for word in ACCESSORY_HEADS}


def _split_units(word: str) -> List[str]:
    """Separa `100hj -> 100 hj`, `12col -> 12 col`, `x12 -> 12`."""
    match = re.fullmatch(r"(\d+)([a-z]+)", word)
    if match and match.group(2) in UNIT_SUFFIXES:
        return [match.group(1), match.group(2)]
    match = re.fullmatch(r"(x|n|no|nro)(\d+)", word)
    if match:
        return [match.group(2)]
    return [word]


def _raw_words(text: str) -> List[str]:
    words: List[str] = []
    for word in normalize_text(text).split():
        words.extend(_split_units(word))
    return words


def _is_meaningful(word: str) -> bool:
    return word not in STOPWORDS and (len(word) > 2 or word.isdigit())


def tokenize(text: str) -> Tuple[List[str], Set[str]]:
    """Tokens relevantes en orden, y los que solo aparecen después de "para"."""
    ordered: List[str] = []
    before: Set[str] = set()
    after: Set[str] = set()
    seen_para = False
    for raw in _raw_words(text):
        if raw == "para":
            seen_para = True
            continue
        aliased = ALIASES.get(raw, raw)
        if not _is_meaningful(aliased):
            continue
        token = canonical_token(aliased)
        if token not in ordered:
            ordered.append(token)
        (after if seen_para else before).add(token)
    return ordered, after - before


def token_weight(token: str) -> float:
    return 0.5 if token.isdigit() or token in GENERIC_TOKENS else 1.0


def is_core(token: str) -> bool:
    return token_weight(token) == 1.0


def score(query: str, title: str) -> Dict[str, float]:
    """Puntaje de coincidencia entre 0 y 1, más un desempate por núcleo.

    `head` vale 1 cuando la primera palabra de producto del título es una de
    las que pidió el usuario: "Olla a presión" antes que "Soporte olla".
    """
    q_tokens, q_accessory = tokenize(query)
    if not q_tokens:
        return {"relevance": 0.0, "head": 0.0}
    t_tokens, t_accessory = tokenize(title)
    t_set = set(t_tokens)

    total = sum(token_weight(token) for token in q_tokens)
    matched = 0.0
    core_matched = False
    core_tokens = [token for token in q_tokens if is_core(token)]
    core_found = sum(1 for token in core_tokens if token in t_set)
    for token in q_tokens:
        if token not in t_set:
            continue
        weight = token_weight(token)
        if token in t_accessory and token not in q_accessory:
            weight *= ACCESSORY_WEIGHT
        elif is_core(token):
            core_matched = True
        matched += weight

    has_core_query = any(is_core(token) for token in q_tokens)
    relevance = matched / total if total else 0.0
    if has_core_query and not core_matched:
        # Solo coinciden cifras, medidas o el destino de un accesorio.
        relevance = min(relevance, MIN_RELEVANCE - 0.01)

    q_set = set(q_tokens)
    head_token = next((token for token in t_tokens if is_core(token)), None)
    if head_token in _ACCESSORY_HEAD_ROOTS and head_token not in q_set:
        relevance *= ACCESSORY_HEAD_FACTOR
    head = 1.0 if head_token and head_token in q_set else 0.0
    coverage = core_found / len(core_tokens) if core_tokens else 1.0
    return {"relevance": round(relevance, 3), "head": head, "core_coverage": round(coverage, 3)}


def token_overlap(query: str, title: str) -> float:
    return score(query, title)["relevance"]


def is_relevant(query: str, title: str, min_ratio: float = MIN_RELEVANCE) -> bool:
    return token_overlap(query, title) >= min_ratio


def _search_stem(word: str) -> str:
    """Forma de búsqueda que calza por subcadena con singular y plural.

    `estuches -> estuch` (calza "Estuche" y "Estuches"), `pinceles -> pincel`,
    `tijeras -> tijera`. Los plurales en "-ces" se dejan tal cual: "lápices"
    no contiene "lápiz" (ver `simplified_queries`, que prueba ambos).
    """
    if len(word) > 4 and word.endswith("ces"):
        return word
    if len(word) > 4 and word.endswith("es") and word[-3] not in "aeiou":
        return word[:-2]
    if len(word) > 3 and word.endswith("s") and not word.endswith(("is", "us", "ss")):
        return word[:-1]
    return word


def simplified_queries(query: str) -> List[str]:
    """Consultas más simples para reintentar en tiendas que no encuentran nada.

    Las búsquedas internas de WooCommerce y de varios temas exigen que todas
    las palabras aparezcan tal cual: "cuaderno universitario 100 hojas" o
    "estuches" devuelven cero aunque la tienda venda cuadernos universitarios
    y estuches. Se reintenta con las dos primeras palabras de producto (sin
    cifras ni medidas y con el plural recortado) y luego con la primera.

    No se aplican sinónimos: la consulta que llega a la tienda usa las
    palabras del usuario ("huincha de medir" no se convierte en "cinta").
    Los resultados de estas consultas deben cubrir *todas* las palabras de
    producto de la consulta original (ver `FALLBACK_MIN_COVERAGE`).
    """
    words: List[str] = []
    for raw in normalize_text(query).split():
        if any(char.isdigit() for char in raw):
            continue
        if not _is_meaningful(raw) or canonical_token(raw) in GENERIC_TOKENS:
            continue
        stem = _search_stem(raw)
        if stem not in words:
            words.append(stem)

    original = normalize_text(query)
    options = [" ".join(words[:2]), " ".join(words[:1])]
    if words and len(words[0]) > 4 and words[0].endswith("ces"):
        # "lapices" y "lapiz" no se contienen: se prueba también el singular.
        options.append(f"{words[0][:-3]}z")
    candidates: List[str] = []
    for candidate in options:
        if candidate and candidate != original and candidate not in candidates:
            candidates.append(candidate)
    return candidates


#: Un resultado que llega por una consulta simplificada debe contener todas
#: las palabras de producto de la consulta original: "Goma de borrar" no es
#: "goma eva" aunque la búsqueda de respaldo haya sido "goma".
FALLBACK_MIN_COVERAGE = 1.0


def rank_key(hit: Dict[str, object]) -> Tuple[int, float, float, float]:
    """Orden final: disponible, más relevante, más barato y, en empate, el
    título que empieza por el producto buscado."""
    price = hit.get("price")
    return (
        0 if hit.get("available") is not False else 1,
        -float(hit.get("relevance") or 0.0),
        float(price) if isinstance(price, (int, float)) and price > 0 else float("inf"),
        -float(hit.get("head") or 0.0),
    )


def best_hits(hits: Sequence[Dict[str, object]]) -> List[Dict[str, object]]:
    return sorted(hits, key=rank_key)
