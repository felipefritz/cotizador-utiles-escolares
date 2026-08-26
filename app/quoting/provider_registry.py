from __future__ import annotations

from typing import Dict, List


CORE_PROVIDERS = [
    # Librería, papelería y útiles escolares
    "dimeiggs",
    "libreria_nacional",
    "pronobel",
    "prisa",
    "lasecretaria",
    "siemprelistos",
    "arteideas",
    "papelaria",
    "libreriaacuario",
    "bazarte",
    "libreriameiggs",
    "comercialcr",
    "tecnoutiles",
    "felizgroup",
    "torre",
    "libreriaolimpica",
    "antartica",
    "fasit",
    "elcuaderno",
    "mabeduna",
    "librerianene",
    # Arte y manualidades
    "dibu",
    "jabeschile",
    "somosarte",
    "lacasadelarte",
    "artemania",
    "disenarte",
    # Construcción y ferretería
    "construfer",
    "ferreteriaprat",
    "hangar77",
    "construplaza",
    "patioferretero",
    "herramientastotal",
    "ferreteriastore",
    "chileferret",
    "herramientasferreteria",
    # Casa y hogar
    "kitchencenter",
    "homemobili",
    "fissman",
    "kitchenhouse",
    "weitzler",
    "santamariana",
    "bazared",
    "portomenaje",
    "tiendacopec",
    "homeonline",
    "rosen",
    "fullmuebles",
    "prido",
    "euromob",
    "dimensiona",
    "productosdeaseo",
    "llabres",
    # Tecnología
    "alltec",
    "maxitech",
    "casaroyal",
    "chilepc",
    "cintegral",
    "notebookstore",
    "compuelite",
    "centralgamer",
    "trulustore",
    "xtremecomponents",
    # Mascotas
    "bpets",
    "pethome",
    "maximascotas",
    "patitasdemia",
    "animaladas",
    "bokapets",
    "todoparasumascota",
    "petco",
    # Supermercados
    "jumbo",
    "lider",
    "santaisabel",
    "tottus",
    "apishop",
    # Mayoristas y distribuidores
    "alimentika",
    "distribuidorasantiago",
    "minimayorista",
    "distribuidoraonline",
    "fermarket",
    "rgc",
    "aseopormayor",
    "outletdeaseo",
]

AREA_DEFINITIONS = [
    {"id": "general", "name": "General", "description": "Productos de cualquier categoría"},
    {"id": "construccion", "name": "Construcción", "description": "Ferretería, herramientas y materiales"},
    {"id": "oficina", "name": "Oficina", "description": "Papelería, insumos y equipamiento"},
    {"id": "hogar", "name": "Casa y hogar", "description": "Muebles, cocina y organización"},
    {"id": "tecnologia", "name": "Tecnología", "description": "Computación, periféricos y electrónica"},
    {"id": "educacion", "name": "Educación", "description": "Útiles, arte y librería"},
    {"id": "supermercado", "name": "Supermercado", "description": "Abarrotes, aseo y consumo diario"},
    {"id": "mayorista", "name": "Mayoristas", "description": "Distribuidores, compra por volumen y aseo"},
    {"id": "mascotas", "name": "Mascotas", "description": "Alimentos, salud, higiene y accesorios"},
]

PROVIDER_AREAS: Dict[str, List[str]] = {
    "mercadolibre": ["general", "construccion", "oficina", "hogar", "tecnologia", "educacion"],
    # Librería, papelería y útiles escolares
    "dimeiggs": ["general", "oficina", "hogar", "tecnologia", "educacion"],
    "libreria_nacional": ["oficina", "educacion"],
    "pronobel": ["oficina", "educacion"],
    "prisa": ["oficina", "educacion"],
    "lasecretaria": ["oficina", "educacion"],
    "siemprelistos": ["oficina", "educacion"],
    "arteideas": ["oficina", "educacion"],
    "papelaria": ["oficina", "educacion"],
    "libreriaacuario": ["oficina", "educacion"],
    "bazarte": ["oficina", "educacion"],
    "libreriameiggs": ["oficina", "educacion"],
    "comercialcr": ["oficina", "educacion"],
    "tecnoutiles": ["oficina", "educacion", "tecnologia"],
    "felizgroup": ["oficina", "educacion"],
    "torre": ["oficina", "educacion"],
    "libreriaolimpica": ["oficina", "educacion"],
    "antartica": ["educacion"],
    "fasit": ["oficina", "hogar"],
    "elcuaderno": ["oficina", "educacion"],
    "mabeduna": ["oficina", "educacion"],
    "librerianene": ["oficina", "educacion"],
    # Arte y manualidades
    "dibu": ["educacion", "oficina"],
    "jabeschile": ["educacion", "oficina"],
    "somosarte": ["educacion"],
    "lacasadelarte": ["educacion", "oficina"],
    "artemania": ["educacion", "oficina"],
    "disenarte": ["educacion", "oficina"],
    # Construcción y ferretería
    "construfer": ["construccion"],
    "ferreteriaprat": ["construccion"],
    "hangar77": ["construccion"],
    "construplaza": ["construccion", "hogar"],
    "patioferretero": ["construccion"],
    "herramientastotal": ["construccion"],
    "ferreteriastore": ["construccion"],
    "chileferret": ["construccion"],
    "herramientasferreteria": ["construccion"],
    # Casa y hogar
    "kitchencenter": ["hogar"],
    "homemobili": ["hogar", "oficina"],
    "fissman": ["hogar"],
    "kitchenhouse": ["hogar"],
    "weitzler": ["hogar"],
    "santamariana": ["hogar"],
    "bazared": ["hogar", "general"],
    "portomenaje": ["hogar"],
    "tiendacopec": ["hogar", "general"],
    "homeonline": ["hogar", "tecnologia"],
    "rosen": ["hogar"],
    "fullmuebles": ["oficina", "hogar"],
    "prido": ["oficina"],
    "euromob": ["oficina"],
    "dimensiona": ["oficina", "hogar"],
    "productosdeaseo": ["hogar", "oficina"],
    "llabres": ["hogar", "oficina"],
    # Tecnología
    "alltec": ["tecnologia", "oficina"],
    "maxitech": ["general", "oficina", "hogar", "tecnologia"],
    "casaroyal": ["general", "hogar", "tecnologia"],
    "chilepc": ["tecnologia"],
    "cintegral": ["tecnologia"],
    "notebookstore": ["tecnologia", "oficina"],
    "compuelite": ["tecnologia"],
    "centralgamer": ["tecnologia"],
    "trulustore": ["tecnologia"],
    "xtremecomponents": ["tecnologia"],
    # Mascotas
    "bpets": ["mascotas"],
    "pethome": ["mascotas"],
    "maximascotas": ["mascotas"],
    "patitasdemia": ["mascotas"],
    "animaladas": ["mascotas"],
    "bokapets": ["mascotas"],
    "todoparasumascota": ["mascotas"],
    "petco": ["mascotas"],
    # Supermercados
    "jumbo": ["supermercado"],
    "lider": ["supermercado"],
    "santaisabel": ["supermercado"],
    "tottus": ["supermercado"],
    "apishop": ["hogar", "supermercado"],
    # Mayoristas y distribuidores: se mantienen disponibles, pero separados de
    # las cadenas de supermercado que compra el consumidor final.
    "alimentika": ["mayorista"],
    "distribuidorasantiago": ["mayorista"],
    "minimayorista": ["mayorista"],
    "distribuidoraonline": ["mayorista"],
    "fermarket": ["mayorista"],
    "rgc": ["mayorista", "hogar"],
    "aseopormayor": ["mayorista", "hogar"],
    "outletdeaseo": ["mayorista", "hogar"],
}


def available_providers(area: str | None = None) -> List[str]:
    providers = list(CORE_PROVIDERS)
    if area:
        providers = [provider for provider in providers if area in PROVIDER_AREAS.get(provider, [])]
    return providers


def demo_provider_limit(area: str) -> int:
    """Tope de fuentes públicas por área.

    Supermercado es una comparación de canasta: mostrar solo dos cadenas hace
    que la prueba no represente el valor del producto. Por eso consulta todas
    las cadenas minoristas publicadas; las demás áreas conservan el tope de 2.
    """
    providers = available_providers(area)
    return len(providers) if area == "supermercado" else min(2, len(providers))


def public_areas() -> List[Dict[str, object]]:
    return [
        {**area, "providers": available_providers(str(area["id"]))}
        for area in AREA_DEFINITIONS
    ]
