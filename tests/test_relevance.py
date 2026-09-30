"""Orden de resultados: lo que decide qué producto ve primero el usuario."""
from __future__ import annotations

from app.quoting.multi_provider import _is_relevant_hit, _token_overlap


def test_exact_match_scores_full() -> None:
    assert _token_overlap("cuaderno universitario", "Cuaderno Universitario Croquis") == 1.0


def test_ignores_accents_and_casing() -> None:
    assert _token_overlap("tempera georgi", "Témpera Georgi 15 ml") == 1.0


def test_quantities_discriminate_between_products() -> None:
    """En una lista escolar la cifra es la diferencia entre un producto y otro."""
    query = "tempera 12 colores"
    assert _token_overlap(query, "Tempera Georgi 12 Colores") == 1.0
    assert _token_overlap(query, "Tempera Artel 6 Colores") < 1.0


def test_sheet_count_discriminates_notebooks() -> None:
    query = "cuaderno universitario 100 hojas"
    assert _token_overlap(query, "Cuaderno Universitario 100 Hojas 7mm") == 1.0
    assert _token_overlap(query, "Cuaderno Universitario 60 Hojas") < 1.0


def test_unrelated_title_scores_zero() -> None:
    assert _token_overlap("cuaderno universitario", "Taladro Percutor 650W") == 0.0


def test_query_without_meaningful_tokens_scores_zero() -> None:
    assert _token_overlap("de la", "Cuaderno Universitario") == 0.0


def test_spanish_plural_and_singular_are_equivalent() -> None:
    assert _token_overlap("set de ollas", "Set Olla 6 piezas") == 1.0
    assert _token_overlap("monitores", "Monitor Gamer 24 pulgadas") == 1.0
    assert _token_overlap("lapices", "Lápiz grafito HB") == 1.0


def test_unrelated_promoted_products_are_rejected() -> None:
    assert _is_relevant_hit("notebook lenovo ideapad", "Mouse gamer inalámbrico") is False
    assert _is_relevant_hit("notebook lenovo ideapad", "Notebook Lenovo Ideapad Slim 3") is True


# --- Casos reales observados en la validación en vivo (septiembre 2026) ---

from app.quoting.relevance import best_hits, score, simplified_queries  # noqa: E402


def test_plural_with_e_matches_singular() -> None:
    """"estuches" dejaba la raíz "estuch" y no coincidía con "Estuche"."""
    assert _token_overlap("estuches", "Estuche Mikonos Burgundy") == 1.0
    assert _token_overlap("sobres", "Sobre Papel Lustre 10 hojas") == 1.0
    assert _token_overlap("colores", "Lápices Color 12") == 1.0


def test_store_abbreviations_are_expanded() -> None:
    assert _token_overlap("cuaderno universitario 100 hojas", "CUAD. UNIV CROQUIS. LISO 100 HJS ROSS") == 1.0
    assert _token_overlap("cuaderno universitario 100 hojas", "CUADERNO UNIVERSITARIO TORRE 100hj CROQUIS LISO") == 1.0
    assert _token_overlap("lapices de colores 12", "LAPICES COLORES 12col. LARGO KREARTE") == 1.0
    assert _token_overlap("tijera punta roma", 'TIJERA ESCOLAR PTA ROMA 14,5 cm 5 3/4" KREARTE') == 1.0
    assert _token_overlap("cinta aisladora", "Huincha Aisladora 3M Super 33") == 1.0


def test_matching_only_numbers_and_units_is_not_enough() -> None:
    """Un papel de sublimación "100 hojas" no es un cuaderno de 100 hojas."""
    assert not _is_relevant_hit("cuaderno universitario 100 hojas", "Papel de Sublimación Premium A4 100g / 100 hojas")
    assert not _is_relevant_hit("lapices de colores 12", "Ojetillos 4mm Mix 10 Colores – Pack 1000 unidades")


def test_accessories_do_not_pass_as_the_product() -> None:
    assert not _is_relevant_hit("olla", "Esponja de Acero para Ollas")
    assert not _is_relevant_hit("olla", "Lana Fina Para Ollas Grandes, 1 Un - Virutex")
    assert not _is_relevant_hit("cuaderno universitario 100 hojas", "Estuche c/Elástico para Cuaderno Azul")


def test_para_in_the_query_is_respected() -> None:
    assert _token_overlap("arena para gatos", "Easy Clean Arena Sanitaria para Gatos 20KG") == 1.0


def test_real_product_ranks_above_accessory_and_cover() -> None:
    hits = [
        {"title": "Soporte olla", "price": 990, "available": True},
        {"title": "Olla a Presión 11 Litros Fast Cook", "price": 29990, "available": True},
    ]
    for hit in hits:
        hit.update(score("olla", hit["title"]))
    assert best_hits(hits)[0]["title"].startswith("Olla")

    forro = score("cuaderno universitario 100 hojas", "FORRO CUADERNO UNIVERSITARIO AMARILLO.")
    real = score("cuaderno universitario 100 hojas", "CUADERNO UNIVERSITARIO TORRE 100hj CROQUIS LISO")
    assert real["relevance"] > forro["relevance"]


def test_out_of_stock_never_wins_over_available() -> None:
    hits = [
        {"title": "MARTILLO CARPINTERO 16 OZ", "price": 5593, "available": False, "relevance": 1.0, "head": 1.0},
        {"title": "MARTILLO ALBAÑIL 600GR", "price": 12465, "available": True, "relevance": 1.0, "head": 1.0},
    ]
    assert best_hits(hits)[0]["available"] is True


def test_simplified_queries_drop_numbers_units_and_plurals() -> None:
    assert simplified_queries("cuaderno universitario 100 hojas") == ["cuaderno universitario", "cuaderno"]
    assert simplified_queries("estuches") == ["estuch"]
    assert simplified_queries("pinceles paleta") == ["pincel paleta", "pincel"]
    assert simplified_queries("lapices de colores 12") == ["lapices", "lapiz"]
    assert simplified_queries("resma carta") == ["resma"]
    assert simplified_queries("sarten 24 cm") == ["sarten"]
    assert simplified_queries("tijera") == []


def test_simplified_queries_keep_the_users_words() -> None:
    """Los sinónimos sirven para puntuar, no para cambiar lo que se busca."""
    assert simplified_queries("huincha de medir") == ["huincha medir", "huincha"]


# --- Casos vistos en producción (preciofast.cl, 30 de septiembre de 2026) ---


def test_other_product_made_of_the_query_is_not_the_product() -> None:
    """Fermarket devolvía "Galletas de Arroz" ($450) como el arroz más barato."""
    assert not _is_relevant_hit("arroz", "Galletas de Arroz Manzana 20g Mizos")
    assert not _is_relevant_hit("taladro", "Batería de taladro 20V")
    assert not _is_relevant_hit("silla", "Cojín de silla")
    assert _is_relevant_hit("arroz", "Arroz Grado 1 Grano Largo y Delgado 1 kg")


def test_containers_and_the_product_itself_before_de_keep_full_score() -> None:
    assert _token_overlap("broca", "Juego De Brocas Cobalto 20pcs") == 1.0
    assert _token_overlap("cemento", "Saco de cemento 25 kg") == 1.0
    assert _token_overlap("papel carta", "Resma de papel carta 500 hojas") == 1.0
    assert _token_overlap("olla", "Set de ollas 6 piezas") == 1.0
    assert _token_overlap("cuaderno", "Cuaderno de matemáticas 100 hojas") == 1.0
    assert _token_overlap("taladro", "Taladro Percutor de 13 mm 650W") == 1.0


def test_para_after_the_requested_product_is_not_an_accessory() -> None:
    """"Alimento para perros" es alimento de perro: antes quedaba en 0,675 y
    perdía contra un producto más caro titulado "Alimento perro"."""
    assert _token_overlap("alimento perro adulto", "HILLS Science Diet Alimento para Perros adultos") == 1.0
    assert _token_overlap("soporte monitor", "Soporte para monitor 27") == 1.0


def test_accessory_head_is_not_quoted_as_the_product() -> None:
    """Maxitech y Trulu daban un soporte como precio de "monitor" y Librería
    Nené un forro como precio de "cuaderno"."""
    assert not _is_relevant_hit("monitor", "Soporte Tv Pantalla Monitor Fijo 40-70 Microlab")
    assert not _is_relevant_hit("monitor", "BRAZO SOPORTE MONITOR MSI MAG MT101G")
    assert not _is_relevant_hit("cuaderno", "FORRO CUADERNO UNIVERSITARIO AMARILLO.")
    assert _is_relevant_hit("forro cuaderno", "FORRO CUADERNO UNIVERSITARIO AMARILLO.")


def test_photocopy_paper_is_a_ream() -> None:
    """Fasit titula las resmas "Papel Fotocopia - Carta 500 HJS / 75 GR"."""
    assert _token_overlap("resma carta", "Papel Fotocopia - Carta  500 HJS / 75 GR Premier") == 1.0
    assert _token_overlap("resma oficio", "Papel Fotocopia - Carta 500 HJS / 75 GR Pix") < 1.0


def test_model_color_and_size_words_do_not_identify_a_product() -> None:
    """En producción, "macbook pro" (Tecnología) mostraba "Estuche Pro Mujer"
    de Dimeiggs: coincidir en "pro" bastaba para pasar el umbral."""
    assert not _is_relevant_hit("macbook pro", "Estuche Pro Mujer 3 Diseños Lavoro")
    assert _token_overlap("macbook pro", "Apple MacBook Pro 14 M3 512GB") == 1.0
    assert not _is_relevant_hit("silla gamer", "Mouse Gamer Logitech G203")
    assert not _is_relevant_hit("mouse inalambrico", "Taladro Inalámbrico 20V")
    assert not _is_relevant_hit("lapiz azul", "Cuaderno azul 100 hojas")
    assert _token_overlap("cartulina negra", "Cartulina Negra 50x65") == 1.0


def test_the_requested_model_ranks_above_a_sibling_model() -> None:
    pro = score("macbook pro", "Apple MacBook Pro 14 M3")
    air = score("macbook pro", "Apple MacBook Air 13 M2")
    assert pro["relevance"] > air["relevance"]


def test_de_only_marks_its_complement() -> None:
    """Casos reales que una regla más amplia habría descartado."""
    assert _token_overlap("set de cuchillos", "Set Taco de 5 Cuchillos con Afilador Eversharp Pro Tefal") == 1.0
    assert _token_overlap(
        "alimento gato", "Wholehearted Libre de Granos Alimento Natural para Gato Todas las Edades"
    ) == 1.0
    assert not _is_relevant_hit("arroz", "Pasta de Arroz Trattoria 250 g")


def test_ties_keep_the_same_order_whatever_source_answers_first() -> None:
    a = {"title": "Estuche Pro Mujer", "price": 3290, "available": True, "relevance": 1.0, "head": 1.0, "provider": "dimeiggs"}
    b = {"title": "Estuche Acuarela", "price": 3290, "available": True, "relevance": 1.0, "head": 1.0, "provider": "siemprelistos"}
    assert best_hits([a, b]) == best_hits([b, a])
