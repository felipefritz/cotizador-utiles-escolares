import json
import re
import requests
from schemas import ParsedList

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "llama3.1"



PROMPT_TEMPLATE = """Eres un extractor de listas de útiles desde texto.

Reglas:
- NO inventes items.
- Ignora títulos/encabezados.
- Si una línea está partida, únelas.
- Devuelve SOLO JSON válido con este esquema:
{{
  "curso": null,
  "items": [
    {{
      "asignatura": null,
      "detalle": "string",
      "cantidad": 1,
      "unidad": "unid|caja|sobre|pliego|bolsa|resma|pack|null",
      "item_original": "string",
      "confianza": 0.0
    }}
  ]
}}

Texto:
<<<
{content}
>>>
"""

import json
import re

def _extract_json(raw: str) -> str:
    """
    Intenta extraer JSON aunque el modelo meta texto antes/después.
    Estrategia:
    - Busca el primer '{' y el último '}' e intenta parsear.
    - Si falla, busca candidatos con regex y prueba parsear.
    """
    if not raw:
        raise ValueError("Respuesta vacía del modelo.")

    # 1) intento amplio: desde primer { hasta último }
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = raw[start:end+1]
        try:
            json.loads(candidate)
            return candidate
        except Exception:
            pass

    # 2) intento por candidatos (no perfecto, pero ayuda)
    candidates = re.findall(r"\{[\s\S]*\}", raw)
    for c in candidates:
        try:
            json.loads(c)
            return c
        except Exception:
            continue

    raise ValueError("No se encontró JSON en la respuesta del modelo.")


def call_llm_fix(dub_lines: list[str]) -> dict:
    prompt = PROMPT_TEMPLATE

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "Responde SOLO en JSON válido. Sin texto extra."},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "format": "json",   # 👈 clave
    }

    r = requests.post(OLLAMA_URL, json=payload, timeout=120)
    r.raise_for_status()

    try:
        json_str = _extract_json(raw)
    except Exception:
        print("LLM RAW (first 800):", raw[:800])
        raise
    
    data = r.json()
    raw = data["message"]["content"]  # aquí viene el JSON como string

    # ahora NO necesitas extractores agresivos:
    return json.loads(raw)
