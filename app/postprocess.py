LECTURA_KEYS = ("lectura", "lecturas complementarias", "libro", "novela")

def postprocess_items(items: list[dict]) -> list[dict]:
    current_subject = None

    for it in items:
        asig = it.get("asignatura")
        detalle = (it.get("detalle") or "").strip().lower()
        orig = (it.get("item_original") or "").strip().lower()

        # Mantén "contexto" de asignatura
        if asig:
            current_subject = asig
        else:
            # si no viene asignatura, hereda la última
            it["asignatura"] = current_subject

        # Detecta lecturas complementarias (libros)
        if any(k in detalle for k in LECTURA_KEYS) or (" - " in it.get("item_original", "")):
            # heurística simple: si parece título-autor, es lectura
            if it.get("unidad") is None:
                it["tipo"] = "lectura"
                # opcional: fuerza asignatura "LENGUAJE"
                if it.get("asignatura") is None:
                    it["asignatura"] = "LENGUAJE"

    return items
