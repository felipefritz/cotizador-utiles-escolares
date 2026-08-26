"""Orden de resultados: lo que decide qué producto ve primero el usuario."""
from __future__ import annotations

from app.quoting.multi_provider import _token_overlap


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
