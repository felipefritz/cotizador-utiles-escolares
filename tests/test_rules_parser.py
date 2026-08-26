"""Parseo determinista de listas escolares."""
from __future__ import annotations

from app.rules_parser import (
    parse_item_line,
    parse_with_rules,
    section_only,
    split_lines,
    strip_leading_connector,
)


def parse(text: str) -> list[dict]:
    return parse_with_rules(split_lines(text))["items"]


def test_strip_leading_connector_removes_dangling_word() -> None:
    assert strip_leading_connector("de témpera 12 colores") == "témpera 12 colores"
    assert strip_leading_connector("témpera 12 colores") == "témpera 12 colores"
    # "de" solo, sin nada detrás, se deja tal cual en vez de vaciar el detalle.
    assert strip_leading_connector("de") == "de"


def test_unit_before_detail_does_not_leave_the_connector() -> None:
    """'1 caja de témpera' debe cotizarse como 'témpera', no como 'de témpera'."""
    item = parse_item_line("1 caja de témpera 12 colores")
    assert item is not None
    assert item["detalle"] == "témpera 12 colores"
    assert item["unidad"] == "caja"
    assert item["cantidad"] == 1


def test_unit_at_line_start_does_not_leave_the_connector() -> None:
    item = parse_item_line("Caja de lápices de colores 2")
    assert item is not None
    assert item["detalle"] == "lápices de colores"
    assert item["unidad"] == "caja"


def test_section_only_detects_headings_outside_the_known_list() -> None:
    assert section_only("ARTES VISUALES") == "ARTES VISUALES"
    assert section_only("USO GENERAL") == "USO GENERAL"
    assert section_only("Educación Física:") == "EDUCACIÓN FÍSICA"


def test_section_only_ignores_lines_that_are_really_items() -> None:
    """Una línea con cantidad es un item aunque venga en mayúsculas."""
    assert section_only("2 CUADERNOS UNIVERSITARIOS") is None
    assert section_only("CUADERNO 100 HOJAS") is None


def test_section_only_ignores_long_prose_and_document_headers() -> None:
    assert section_only("Todos los materiales deben venir marcados con el nombre") is None
    assert section_only("LISTA DE ÚTILES") is None


def test_subject_is_inherited_until_the_next_heading() -> None:
    items = parse(
        """
        LENGUAJE
        2 cuadernos universitarios 100 hojas
        ARTES VISUALES
        1 caja de témpera 12 colores
        2 pinceles paleta N° 6
        USO GENERAL
        1 goma de borrar
        """
    )
    asignaturas = [item["asignatura"] for item in items]
    assert asignaturas == [
        "LENGUAJE",
        "ARTES VISUALES",
        "ARTES VISUALES",
        "USO GENERAL",
    ]


def test_uppercase_list_keeps_every_item() -> None:
    """Riesgo del detector por forma: una lista toda en mayúsculas."""
    items = parse(
        """
        MATEMÁTICA
        1 CUADERNO UNIVERSITARIO 100 HOJAS
        2 LÁPICES GRAFITO
        1 GOMA DE BORRAR 1
        """
    )
    detalles = [item["detalle"] for item in items]
    assert len(items) == 3, detalles
    assert all(item["asignatura"] == "MATEMÁTICA" for item in items)


def test_quantity_and_detail_are_separated() -> None:
    items = parse("3 cuadernos college 80 hojas")
    assert items[0]["cantidad"] == 3
    assert items[0]["detalle"] == "cuadernos college 80 hojas"
