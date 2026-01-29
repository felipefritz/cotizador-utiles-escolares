from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from datetime import datetime

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


# ============ PROVIDER SUGGESTIONS ============

class ProviderSuggestionCreate(BaseModel):
    provider_name: str
    description: str
    website_url: Optional[str] = None
    email_contact: Optional[str] = None


class ProviderSuggestionUpdate(BaseModel):
    status: Literal["processing", "not_feasible", "completed", "rejected"]
    admin_notes: Optional[str] = None


class ProviderSuggestionResponse(BaseModel):
    id: int
    user_id: int
    provider_name: str
    description: str
    website_url: Optional[str]
    email_contact: Optional[str]
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
