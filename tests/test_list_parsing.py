"""Extracción de ítems: casos reales que antes se perdían sin aviso."""
from __future__ import annotations

import inspect

import pytest

from app import main
from app.llm_client import validate_llm_items
from app.rules_parser import parse_with_rules, split_lines


def _parse(line: str) -> list[dict]:
    return main.normalize_items(parse_with_rules(split_lines(line))["items"])


def test_pincel_numbers_after_comma_stay_in_one_item() -> None:
    items = _parse("3 Pinceles 2, 6 y 8")
    assert [(it["cantidad"], it["detalle"]) for it in items] == [(3, "Pinceles 2, 6 y 8")]


@pytest.mark.parametrize("line", [
    "1 Cuaderno universitario, 100 hojas, cuadro grande",
    "1 caja de lápices de colores, 12 colores",
])
def test_measures_after_comma_stay_in_the_same_item(line: str) -> None:
    assert len(_parse(line)) == 1


def test_real_comma_separated_items_are_still_split() -> None:
    items = _parse("1 Cuaderno 7mm, 1 Diccionario")
    assert [it["detalle"] for it in items] == ["Cuaderno 7mm", "Diccionario"]


@pytest.mark.parametrize("line", [
    "1 Diccionario (sugerido: Aristos)",
    "1 Carpeta roja segundo semestre",
    "1 Calculadora opcional",
    "1 Buzo cómodo ahora",
])
def test_descriptive_words_do_not_discard_items(line: str) -> None:
    assert len(_parse(line)) == 1


@pytest.mark.parametrize("line", ["2 cuotas de $15.000", "Horario 08:00 hrs 2"])
def test_administrative_lines_are_still_discarded(line: str) -> None:
    assert _parse(line) == []


@pytest.mark.parametrize("line", ["1 Cuaderno college - cuadro grande", "1 Martillo - carpintero 16oz"])
def test_dash_alone_does_not_make_a_book(line: str) -> None:
    assert _parse(line)[0]["tipo"] == "producto"


def test_reading_items_are_still_detected() -> None:
    assert main.normalize_items([{"detalle": "El Principito - Saint-Exupéry", "cantidad": 1,
                                   "asignatura": "LECTURAS COMPLEMENTARIAS",
                                   "item_original": "El Principito - Saint-Exupéry"}])[0]["tipo"] == "lectura"
    assert main.normalize_items([{"detalle": "Papelucho, editorial Universitaria", "cantidad": 1,
                                   "item_original": "1 Papelucho, editorial Universitaria"}])[0]["tipo"] == "lectura"


def test_llm_items_outside_the_schema_do_not_break_the_list() -> None:
    items = main.normalize_items([
        {"detalle": "Cuaderno", "item_original": "1 cuaderno", "cantidad": "2", "tipo": None, "confianza": "alta"},
        {"detalle": "Plasticina", "item_original": "1 plasticina", "cantidad": 1, "tipo": "material"},
    ])
    parsed = [main.ParsedItem(**item) for item in items]
    assert [(p.cantidad, p.tipo, p.confianza) for p in parsed] == [(2, "producto", None), (1, "producto", None)]


def test_llm_items_accept_quantity_as_text() -> None:
    items = validate_llm_items([
        {"detalle": "Cuaderno universitario", "item_original": "2 cuadernos", "cantidad": "2"},
        {"detalle": "Diccionario Aristos", "item_original": "1 Diccionario (sugerido: Aristos)", "cantidad": 1},
        {"detalle": "Matrícula", "item_original": "Pago de matrícula en 3 cuotas", "cantidad": 3},
    ])
    assert [(it["detalle"], it["cantidad"]) for it in items] == [
        ("Cuaderno universitario", 2),
        ("Diccionario Aristos", 1),
    ]


@pytest.mark.parametrize("endpoint", [
    main.quote_multi_endpoint,
    main.quote_multi_batch_endpoint,
    main.parse_with_ai_only,
    main.parse_items_without_quote,
    main.parse_ai_and_quote_multi_providers,
    main.purchase_plan_endpoint,
    main.login,
    main.register,
])
def test_blocking_endpoints_run_in_the_threadpool(endpoint) -> None:
    """Un `async def` con I/O bloqueante congela el único worker de Render."""
    assert not inspect.iscoroutinefunction(endpoint)
