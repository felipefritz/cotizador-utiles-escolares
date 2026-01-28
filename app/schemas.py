from pydantic import BaseModel, Field
from typing import Literal, Optional, List

Unidad = Literal["unid", "caja", "sobre", "pliego", "bolsa", "resma", "pack"]

TipoItem = Literal["util", "lectura"]  # 👈

class ParsedItem(BaseModel):
    item_original: str
    detalle: str
    cantidad: Optional[int] = None
    unidad: Optional[Unidad] = None     # 👈 antes era Literal a secas
    asignatura: Optional[str] = None
    tipo: TipoItem = "util"             # 👈 por defecto util
    confianza: Optional[float] = None

class ParsedList(BaseModel):
    raw_text_preview: str
    lines_count: int
    dubious_sent_to_ai: int = 0
    curso: Optional[str] = None
    items: List[ParsedItem]
