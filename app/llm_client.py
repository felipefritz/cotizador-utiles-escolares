import json
import re
import os
import base64
from pathlib import Path
from openai import OpenAI
from app.schemas import ParsedList

# Configuración de proveedores LLM
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()  # groq (gratis) o openai

# Groq (GRATIS - Recomendado para producción)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")  # Modelo de texto
GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "llama-3.2-90b-vision-preview")  # Modelo con visión

# OpenAI (de pago)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_VISION_MODEL = os.getenv("OPENAI_VISION_MODEL", "gpt-4o")

# Inicializar cliente según el proveedor
client = None
if LLM_PROVIDER == "groq" and GROQ_API_KEY:
    client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1"
    )
    print("✅ Usando Groq (GRATIS) para extracción con IA")
elif LLM_PROVIDER == "openai" and OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
    print("✅ Usando OpenAI para extracción con IA")
else:
    print("⚠️  WARNING: No hay LLM configurado. Configure GROQ_API_KEY (gratis) o OPENAI_API_KEY")

# Función helper para obtener el modelo correcto
def get_model(use_vision: bool = False) -> str:
    """Retorna el modelo apropiado según el proveedor y tipo"""
    if LLM_PROVIDER == "groq":
        return GROQ_VISION_MODEL if use_vision else GROQ_MODEL
    else:
        return OPENAI_VISION_MODEL if use_vision else OPENAI_MODEL



PROMPT_TEMPLATE = """Eres un experto extractor de listas de útiles escolares. Tu tarea es analizar el contenido y extraer ÚNICAMENTE los útiles escolares válidos.

**REGLAS CRÍTICAS:**

1. **SOLO extrae útiles escolares reales:**
   - Artículos de escritorio: lápices, cuadernos, bolígrafos, gomas, sacapuntas, reglas
   - Material escolar: tijeras, pegamento, cartulinas, hojas, carpetas, archivadores
   - Libros de texto, diccionarios, atlas
   - Mochilas, loncheras, delantales, uniformes
   - Material de arte: témperas, pinceles, plastilina, acuarelas
   - Material científico: calculadoras, compases, escuadras

2. **RECHAZA absolutamente:**
   - Información administrativa: cuotas, pagos, matrícula, pensión, intereses
   - Horarios: horas de clase, recreos, cronogramas (08:00, 13:00, hrs)
   - Información comercial: promociones, ofertas, stock, disponibilidad, plazos
   - Información institucional: dirección del colegio, teléfonos, emails
   - Información de salud: vacunas, certificados médicos, seguros
   - Instrucciones generales que no sean artículos

3. **Formato de extracción:**
   - Cada item DEBE tener una cantidad numérica explícita
   - Extrae el nombre completo y específico del artículo
   - Incluye características importantes (tamaño, color, tipo) si están especificadas
   - Mantén la asignatura si está indicada

4. **NO inventes ni asumas:**
   - Si no hay cantidad, NO agregues el item
   - Si no estás seguro si es un útil escolar válido, NO lo incluyas
   - Asigna confianza baja (0.5-0.7) si el texto es ambiguo

**Formato de salida (JSON válido):**
{{
  "curso": "string o null - solo si está explícitamente mencionado",
  "items": [
    {{
      "asignatura": "string o null - materia asociada si existe",
      "detalle": "nombre completo del útil escolar con características",
      "cantidad": número entero positivo,
      "unidad": "unid|caja|sobre|pliego|bolsa|resma|pack|null",
      "item_original": "texto original de donde se extrajo",
      "confianza": número decimal entre 0.0 y 1.0
    }}
  ]
}}

**Contenido a analizar:**
<<<
{content}
>>>

**Responde ÚNICAMENTE con el JSON, sin texto adicional.**
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


# Palabras clave que indican que NO es un útil escolar válido
INVALID_KEYWORDS = {
    "cuota", "cuotas", "pago", "pagos", "sin interés", "sin interes",
    "horario", "horarios", "hrs", "horas", "hora",
    "disponible", "disponibilidad", "stock",
    "promoción", "promocion", "oferta",
    "tal como", "según", "segun",
    "recomendado", "sugerido", "opcional",
    "abiertos", "cerrados", "cerrado",
    "covid", "sanitario",
}

def validate_llm_items(items: list) -> list:
    """
    Filtra items inválidos que Ollama podría haber incluido.
    Valida contra palabras clave inválidas y criterios básicos.
    """
    valid_items = []
    for item in items:
        detalle = (item.get("detalle") or "").strip().upper()
        original = (item.get("item_original") or "").strip().upper()
        
        # Revisar si contiene palabras clave inválidas
        is_invalid = False
        for keyword in INVALID_KEYWORDS:
            if keyword.upper() in detalle or keyword.upper() in original:
                is_invalid = True
                break
        
        if is_invalid:
            continue
        
        # Debe tener cantidad
        if item.get("cantidad") is None or item.get("cantidad") < 1:
            continue
        
        # Debe tener detalle mínimo
        if not detalle or len(detalle) < 2:
            continue
        
        # Línea demasiado larga sugiere información mezclada
        if len(detalle) > 150:
            continue
        
        # Patrones de horarios
        if re.search(r"^\d{1,2}:\d{2}\s+(hrs|horas)", detalle):
            continue
        
        valid_items.append(item)
    
    return valid_items



def call_llm_fix(dub_lines: list[str]) -> dict:
    """
    Llama al LLM para extraer útiles de líneas dudosas.
    """
    if not client:
        raise RuntimeError("LLM no configurado. Configure GROQ_API_KEY o OPENAI_API_KEY")
    
    prompt = PROMPT_TEMPLATE.format(content="\n".join(dub_lines))

    response = client.chat.completions.create(
        model=get_model(use_vision=False),
        messages=[
            {"role": "system", "content": "Responde SOLO en JSON válido. Sin texto extra."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"} if LLM_PROVIDER == "openai" else None
    )

    raw = response.choices[0].message.content

    # Extraer JSON de la respuesta
    json_str = _extract_json(raw)
    result = json.loads(json_str)
    
    # Post-procesamiento: validar y filtrar items inválidos
    if "items" in result:
        result["items"] = validate_llm_items(result["items"])
    
    return result


def _encode_image_to_base64(image_path: Path) -> str:
    """Codifica una imagen a base64 para enviarla a la API de OpenAI"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')


def _pdf_to_images_base64(pdf_path: Path) -> list[str]:
    """
    Convierte las páginas de un PDF a imágenes en base64.
    Requiere pdf2image y poppler instalados.
    """
    try:
        from pdf2image import convert_from_path
        
        # Convertir PDF a imágenes (máximo 5 páginas para no exceder límites)
        images = convert_from_path(str(pdf_path), dpi=150, first_page=1, last_page=5)
        
        base64_images = []
        for img in images:
            # Guardar temporalmente como PNG
            import io
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
            base64_images.append(base64.b64encode(img_byte_arr).decode('utf-8'))
        
        return base64_images
    except ImportError:
        print("⚠️  pdf2image no instalado. No se puede usar visión con PDFs.")
        return []
    except Exception as e:
        print(f"⚠️  Error al convertir PDF a imágenes: {e}")
        return []


def call_llm_with_vision(file_path: Path) -> dict:
    """
    Usa GPT-4 Vision para extraer items directamente de un PDF/imagen.
    Mucho mejor para PDFs con formato complejo, tablas o imágenes.
    
    Args:
        file_path: Ruta al archivo PDF o imagen
    
    Returns:
        dict con estructura: {"curso": str|None, "items": [...]}
    """
    if not client:
        raise RuntimeError("OpenAI API key not configured")
    
    ext = file_path.suffix.lower()
    
    # Preparar las imágenes según el tipo de archivo
    if ext == ".pdf":
        base64_images = _pdf_to_images_base64(file_path)
        if not base64_images:
            # Fallback: extraer solo texto
            from app.extractors import extract_text
            raw_text = extract_text(file_path)
            return call_llm_full_extraction(raw_text)
    elif ext in [".png", ".jpg", ".jpeg"]:
        base64_images = [_encode_image_to_base64(file_path)]
    else:
        # Para otros formatos, usar extracción de texto
        from app.extractors import extract_text
        raw_text = extract_text(file_path)
        return call_llm_full_extraction(raw_text)
    
    # Construir mensajes con imágenes
    content = [
        {
            "type": "text",
            "text": PROMPT_TEMPLATE.format(content="Analiza las imágenes y extrae los útiles escolares.")
        }
    ]
    
    # Agregar imágenes al prompt (máximo 3 para no exceder límites)
    for img_base64 in base64_images[:3]:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{img_base64}",
                "detail": "high"  # Alta calidad para mejor OCR
            }
        })
    
    try:
        # Groq tiene un formato ligeramente diferente para imágenes
        messages = [
            {
                "role": "system", 
                "content": "Eres un experto extractor de listas de útiles escolares. Analiza cuidadosamente las imágenes y responde SOLO en JSON válido."
            },
            {
                "role": "user",
                "content": content
            }
        ]
        
        response = client.chat.completions.create(
            model=get_model(use_vision=True),
            messages=messages,
            temperature=0.2,
            max_tokens=4096
        )
        
        raw = response.choices[0].message.content
        
        # Extraer JSON
        json_str = _extract_json(raw)
        result = json.loads(json_str)
        
        # Post-procesamiento
        if "items" in result:
            result["items"] = validate_llm_items(result["items"])
        
        if "curso" not in result:
            result["curso"] = None
        if "items" not in result:
            result["items"] = []
        
        return result
    
    except Exception as e:
        print(f"❌ Error en call_llm_with_vision: {e}")
        return {
            "curso": None,
            "items": [],
            "error": str(e)
        }


def call_llm_full_extraction(raw_text: str) -> dict:
    """
    Usa IA (OpenAI) para extraer TODOS los items del texto completo.
    No usa el parser de reglas, solo IA.
    
    Retorna un dict con estructura similar a parse_with_rules:
    {
        "curso": str | None,
        "items": [{"detalle": str, "cantidad": int, ...}]
    }
    """
    if not client:
        raise RuntimeError("OpenAI API key not configured")
    
    # Validación de entrada
    if not raw_text or len(raw_text.strip()) < 10:
        return {
            "curso": None,
            "items": [],
            "error": "Texto vacío o muy corto"
        }
    
    prompt = PROMPT_TEMPLATE.format(content=raw_text[:15000])  # Limitar tamaño para evitar errores

    try:
        response = client.chat.completions.create(
            model=get_model(use_vision=False),
            messages=[
                {"role": "system", "content": "Eres un extractor experto de listas de útiles escolares. Responde SOLO en JSON válido. Sin texto extra."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"} if LLM_PROVIDER == "openai" else None
        )

        raw = response.choices[0].message.content

        # Extraer JSON
        json_str = _extract_json(raw)
        result = json.loads(json_str)
        
        # Post-procesamiento: validar y filtrar items inválidos
        if "items" in result:
            result["items"] = validate_llm_items(result["items"])
        
        # Asegurar estructura mínima
        if "curso" not in result:
            result["curso"] = None
        if "items" not in result:
            result["items"] = []
        
        return result
    
    except Exception as e:
        print(f"❌ Error en call_llm_full_extraction: {e}")
        # Si falla, retornar estructura vacía
        return {
            "curso": None,
            "items": [],
            "error": str(e)
        }
