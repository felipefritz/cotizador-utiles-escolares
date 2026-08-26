"""Plan de compra: comparar totales con despacho, no solo precios sueltos."""
from __future__ import annotations

from app.quoting.purchase_plan import build_purchase_plans, teaser


def item(detalle: str, cantidad: int, *offers: tuple[str, int], available: bool = True) -> dict:
    return {
        "detalle": detalle,
        "cantidad": cantidad,
        "hits": [
            {
                "provider": provider,
                "price": price,
                "title": f"{detalle} en {provider}",
                "url": f"https://{provider}.cl/{detalle}",
                "available": available,
            }
            for provider, price in offers
        ],
    }


def test_single_store_beats_scattered_minimum_once_shipping_counts() -> None:
    """El mínimo por ítem reparte la compra; con despacho deja de convenir."""
    items = [
        item("cuaderno", 1, ("tiendaA", 1000), ("tiendaB", 1100)),
        item("lapiz", 1, ("tiendaC", 200), ("tiendaB", 250)),
        item("regla", 1, ("tiendaD", 300), ("tiendaB", 350)),
    ]

    result = build_purchase_plans(items, shipping_cost=3000)

    # Baseline: 1000+200+300 = 1500 repartido en 3 tiendas -> +9000 de despacho.
    assert result["baseline"]["subtotal"] == 1500
    assert result["baseline"]["store_count"] == 3
    assert result["baseline"]["total"] == 10500

    # Todo en tiendaB: 1100+250+350 = 1700 con un solo despacho.
    recommended = result["recommended"]
    assert recommended["stores"] == ["tiendaB"]
    assert recommended["subtotal"] == 1700
    assert recommended["total"] == 4700
    assert result["savings"] == 5800
    assert result["stores_saved"] == 2


def test_quantities_multiply_the_line_total() -> None:
    items = [item("cuaderno", 3, ("tiendaA", 1000))]

    result = build_purchase_plans(items, shipping_cost=0)

    assert result["recommended"]["subtotal"] == 3000
    assert result["recommended"]["lines"][0]["line_total"] == 3000
    assert result["recommended"]["lines"][0]["cantidad"] == 3


def test_uncovered_item_is_charged_with_its_own_shipping() -> None:
    """Un plan que no cubre todo no puede parecer más barato de lo que es."""
    items = [
        item("cuaderno", 1, ("tiendaA", 1000)),
        item("exclusivo", 1, ("tiendaZ", 500)),
    ]

    result = build_purchase_plans(items, shipping_cost=2000)

    solo_a = next(plan for plan in result["plans"] if plan["stores"] == ["tiendaA"])
    assert solo_a["items_in_plan"] == 1
    assert [m["reason"] for m in solo_a["missing"]] == ["fuera_del_plan"]
    # 1000 + 500 de producto, y despacho de las DOS tiendas.
    assert solo_a["subtotal"] == 1500
    assert solo_a["shipping"] == 4000
    assert solo_a["total"] == 5500


def test_items_without_any_price_are_reported_not_invented() -> None:
    items = [
        item("cuaderno", 1, ("tiendaA", 1000)),
        {"detalle": "algo raro", "cantidad": 1, "hits": []},
    ]

    result = build_purchase_plans(items, shipping_cost=0)

    recommended = result["recommended"]
    assert recommended["items_in_plan"] == 1
    assert recommended["items_total"] == 2
    assert [m["reason"] for m in recommended["missing"]] == ["sin_precio"]
    assert recommended["subtotal"] == 1000


def test_out_of_stock_offers_are_ignored() -> None:
    items = [
        {
            "detalle": "cuaderno",
            "cantidad": 1,
            "hits": [
                {"provider": "tiendaA", "price": 500, "available": False, "title": "x", "url": "u"},
                {"provider": "tiendaB", "price": 900, "available": True, "title": "y", "url": "u"},
            ],
        }
    ]

    result = build_purchase_plans(items, shipping_cost=0)

    assert result["recommended"]["stores"] == ["tiendaB"]
    assert result["recommended"]["subtotal"] == 900


def test_invalid_prices_are_discarded() -> None:
    items = [
        {
            "detalle": "cuaderno",
            "cantidad": 1,
            "hits": [
                {"provider": "tiendaA", "price": None, "available": True},
                {"provider": "tiendaB", "price": 0, "available": True},
                {"provider": "tiendaC", "price": 700, "available": True},
            ],
        }
    ]

    result = build_purchase_plans(items, shipping_cost=0)

    assert result["recommended"]["stores"] == ["tiendaC"]


def test_plan_spans_two_stores_when_one_cannot_cover_everything() -> None:
    """'x' cubre dos ítems baratos; el tercero solo existe en 'y'."""
    items = [
        item("a", 1, ("x", 100), ("y", 900)),
        item("b", 1, ("x", 100), ("y", 900)),
        item("c", 1, ("y", 100)),
    ]

    result = build_purchase_plans(items, shipping_cost=1000)

    recommended = result["recommended"]
    # Comprar en 'x' y traer 'c' de 'y' cuesta lo mismo que declarar ambas
    # tiendas en el plan, así que se reporta una sola de las dos formas.
    assert sorted(recommended["stores"] + recommended["extra_stores"]) == ["x", "y"]
    assert recommended["store_count"] == 2
    assert recommended["subtotal"] == 300
    assert recommended["total"] == 2300
    assert all(line["price"] == 100 for line in recommended["lines"])


def test_equivalent_store_sets_are_not_listed_twice() -> None:
    items = [
        item("a", 1, ("x", 100), ("y", 900)),
        item("c", 1, ("y", 100)),
    ]

    result = build_purchase_plans(items, shipping_cost=1000)

    signatures = [frozenset(plan["stores"]) | frozenset(plan["extra_stores"]) for plan in result["plans"]]
    assert len(signatures) == len(set(signatures))


def test_plans_are_sorted_by_total() -> None:
    items = [item("a", 1, ("x", 100), ("y", 300)), item("b", 1, ("x", 100), ("y", 300))]

    result = build_purchase_plans(items, shipping_cost=500)

    totals = [plan["total"] for plan in result["plans"]]
    assert totals == sorted(totals)


def test_empty_input_does_not_invent_a_plan() -> None:
    assert build_purchase_plans([])["status"] == "no_results"
    assert build_purchase_plans([{"detalle": "x", "cantidad": 1, "hits": []}])["status"] == "no_results"


def test_shipping_cost_of_zero_is_respected() -> None:
    items = [item("a", 1, ("x", 100), ("y", 90))]

    result = build_purchase_plans(items, shipping_cost=0)

    assert result["recommended"]["shipping"] == 0
    assert result["recommended"]["stores"] == ["y"]


def test_teaser_hides_the_detail_but_keeps_the_hook() -> None:
    items = [
        item("cuaderno", 1, ("tiendaA", 1000), ("tiendaB", 1100)),
        item("lapiz", 1, ("tiendaC", 200), ("tiendaB", 250)),
    ]

    locked = teaser(build_purchase_plans(items, shipping_cost=3000))

    assert locked["locked"] is True
    assert locked["plans"] == []
    assert locked["recommended"] is None
    # El gancho es el ahorro: se muestra el número, no cómo conseguirlo.
    assert locked["savings"] > 0
    assert locked["store_count"] == 1
