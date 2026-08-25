from __future__ import annotations

import os
from typing import List


CORE_PROVIDERS = [
    "mercadolibre",
    "dimeiggs",
    "libreria_nacional",
    "jamila",
    "coloranimal",
    "pronobel",
    "prisa",
    "lasecretaria",
]

WEB_SHOPPING_PROVIDER = "web_shopping"

SERPAPI_RETAIL_PROVIDERS = [
    "solotodo",
    "sodimac",
    "falabella",
    "ripley",
    "pcfactory",
    "paris",
    "lider_web",
    "jumbo_web",
]


def web_shopping_enabled() -> bool:
    return bool(os.getenv("SERPAPI_API_KEY", "").strip())


def available_providers() -> List[str]:
    providers = list(CORE_PROVIDERS)
    if web_shopping_enabled():
        providers.append(WEB_SHOPPING_PROVIDER)
        providers.extend(SERPAPI_RETAIL_PROVIDERS)
    return providers
