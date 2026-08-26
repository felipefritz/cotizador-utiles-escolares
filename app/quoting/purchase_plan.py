"""Plan de compra: en qué tiendas conviene comprar la lista completa.

El cotizador entrega el precio más barato de cada ítem por separado, pero ese
óptimo teórico reparte una lista escolar entre ocho tiendas distintas, con ocho
despachos y ocho checkouts. Este módulo responde la pregunta que el usuario
realmente tiene —"¿dónde compro todo?"— evaluando combinaciones chicas de
tiendas y sumando el costo de despacho.

Todos los planes se dejan comparables: si una combinación no cubre algún ítem,
se le suma ese ítem al mejor precio disponible más un despacho extra, porque el
usuario igual va a tener que comprarlo en alguna parte.
"""
from __future__ import annotations

from itertools import combinations
from typing import Any, Dict, List, Optional, Sequence, Tuple


#: Estimación de despacho por tienda, en CLP. No viene de las tiendas: es un
#: supuesto configurable que se informa junto al plan para que el usuario sepa
#: sobre qué base se comparó.
DEFAULT_SHIPPING_COST = 3990

#: Techo de tiendas por plan. Más de tres destinos deja de ser una compra
#: razonable y el espacio de búsqueda crece sin aportar.
MAX_STORES_PER_PLAN = 3

#: Tiendas candidatas consideradas al combinar. Se ordenan por cobertura, así
#: que el recorte deja fuera las que casi no aportan ítems.
MAX_CANDIDATE_STORES = 20


def _best_prices_by_store(items: Sequence[Dict[str, Any]]) -> List[Dict[str, Dict[str, Any]]]:
    """Para cada ítem, la mejor oferta de cada tienda: `{tienda: hit}`."""
    per_item: List[Dict[str, Dict[str, Any]]] = []
    for item in items:
        offers: Dict[str, Dict[str, Any]] = {}
        for hit in item.get("hits") or []:
            provider = hit.get("provider")
            price = hit.get("price")
            if not provider or not isinstance(price, (int, float)) or price <= 0:
                continue
            if hit.get("available") is False:
                continue
            current = offers.get(provider)
            if current is None or price < current["price"]:
                offers[provider] = {
                    "provider": provider,
                    "price": int(price),
                    "title": hit.get("title"),
                    "url": hit.get("url"),
                }
        per_item.append(offers)
    return per_item


def _quantity(item: Dict[str, Any]) -> int:
    try:
        quantity = int(item.get("cantidad") or 1)
    except (TypeError, ValueError):
        return 1
    return max(1, quantity)


def _cheapest_overall(offers: Dict[str, Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not offers:
        return None
    return min(offers.values(), key=lambda offer: offer["price"])


def _evaluate(
    stores: Tuple[str, ...],
    items: Sequence[Dict[str, Any]],
    per_item: Sequence[Dict[str, Dict[str, Any]]],
    shipping_cost: int,
) -> Dict[str, Any]:
    """Arma el plan de comprar en `stores`, completando lo que falte aparte."""
    lines: List[Dict[str, Any]] = []
    missing: List[Dict[str, Any]] = []
    subtotal = 0
    used_stores: set[str] = set()

    for item, offers in zip(items, per_item):
        quantity = _quantity(item)
        in_plan = {store: offers[store] for store in stores if store in offers}
        if in_plan:
            offer = min(in_plan.values(), key=lambda value: value["price"])
            line_total = offer["price"] * quantity
            subtotal += line_total
            used_stores.add(offer["provider"])
            lines.append({
                "detalle": item.get("detalle"),
                "cantidad": quantity,
                "provider": offer["provider"],
                "price": offer["price"],
                "line_total": line_total,
                "title": offer["title"],
                "url": offer["url"],
                "in_plan": True,
            })
            continue

        # Fuera del plan: se compra donde salga más barato, y eso agrega un
        # despacho más. Sin esto un plan que "no cubre" parecería más barato.
        fallback = _cheapest_overall(offers)
        if fallback is None:
            missing.append({"detalle": item.get("detalle"), "cantidad": quantity, "reason": "sin_precio"})
            continue
        line_total = fallback["price"] * quantity
        subtotal += line_total
        lines.append({
            "detalle": item.get("detalle"),
            "cantidad": quantity,
            "provider": fallback["provider"],
            "price": fallback["price"],
            "line_total": line_total,
            "title": fallback["title"],
            "url": fallback["url"],
            "in_plan": False,
        })
        missing.append({
            "detalle": item.get("detalle"),
            "cantidad": quantity,
            "reason": "fuera_del_plan",
            "provider": fallback["provider"],
        })

    extra_stores = {line["provider"] for line in lines if not line["in_plan"]}
    all_stores = used_stores | extra_stores
    shipping = shipping_cost * len(all_stores)

    return {
        "stores": sorted(used_stores),
        "extra_stores": sorted(extra_stores),
        "store_count": len(all_stores),
        "items_in_plan": sum(1 for line in lines if line["in_plan"]),
        "items_total": len(items),
        "missing": missing,
        "subtotal": subtotal,
        "shipping": shipping,
        "total": subtotal + shipping,
        "lines": lines,
    }


def _candidate_stores(per_item: Sequence[Dict[str, Dict[str, Any]]]) -> List[str]:
    coverage: Dict[str, int] = {}
    for offers in per_item:
        for provider in offers:
            coverage[provider] = coverage.get(provider, 0) + 1
    ordered = sorted(coverage, key=lambda provider: (-coverage[provider], provider))
    return ordered[:MAX_CANDIDATE_STORES]


def build_purchase_plans(
    items: Sequence[Dict[str, Any]],
    shipping_cost: int = DEFAULT_SHIPPING_COST,
    max_stores: int = MAX_STORES_PER_PLAN,
) -> Dict[str, Any]:
    """Compara comprar todo en 1, 2 o 3 tiendas contra el mínimo por ítem.

    Args:
        items: ítems con `detalle`, `cantidad` y `hits` (contrato de hit).
        shipping_cost: despacho estimado por tienda, en CLP.
        max_stores: máximo de tiendas por plan.

    Returns:
        Dict con `baseline` (el mínimo por ítem, repartido), `plans` ordenados
        de menor a mayor total, `recommended` y el ahorro contra el baseline.
    """
    items = [item for item in items if item]
    shipping_cost = max(0, int(shipping_cost))
    max_stores = max(1, min(int(max_stores), MAX_STORES_PER_PLAN))

    per_item = _best_prices_by_store(items)
    quotable = [offers for offers in per_item if offers]
    if not items or not quotable:
        return {
            "status": "no_results",
            "shipping_cost_per_store": shipping_cost,
            "baseline": None,
            "plans": [],
            "recommended": None,
            "savings": 0,
            "stores_saved": 0,
        }

    # Baseline: lo que hace hoy el cotizador, el mínimo de cada ítem por
    # separado, sin mirar en cuántas tiendas termina repartida la compra.
    baseline_lines: List[Dict[str, Any]] = []
    baseline_subtotal = 0
    baseline_stores: set[str] = set()
    for item, offers in zip(items, per_item):
        cheapest = _cheapest_overall(offers)
        if cheapest is None:
            continue
        quantity = _quantity(item)
        line_total = cheapest["price"] * quantity
        baseline_subtotal += line_total
        baseline_stores.add(cheapest["provider"])
        baseline_lines.append({
            "detalle": item.get("detalle"),
            "cantidad": quantity,
            "provider": cheapest["provider"],
            "price": cheapest["price"],
            "line_total": line_total,
            "title": cheapest["title"],
            "url": cheapest["url"],
            "in_plan": True,
        })

    baseline = {
        "stores": sorted(baseline_stores),
        "store_count": len(baseline_stores),
        "items_in_plan": len(baseline_lines),
        "items_total": len(items),
        "subtotal": baseline_subtotal,
        "shipping": shipping_cost * len(baseline_stores),
        "total": baseline_subtotal + shipping_cost * len(baseline_stores),
        "lines": baseline_lines,
    }

    candidates = _candidate_stores(per_item)
    evaluated: List[Dict[str, Any]] = []
    for size in range(1, max_stores + 1):
        if size > len(candidates):
            break
        for combo in combinations(candidates, size):
            evaluated.append(_evaluate(combo, items, per_item, shipping_cost))

    # Se ordena antes de deduplicar: varias combinaciones terminan usando las
    # mismas tiendas y hay que quedarse con la asignación más barata, no con
    # la primera que aparezca.
    evaluated.sort(key=lambda plan: (plan["total"], plan["store_count"]))
    plans: List[Dict[str, Any]] = []
    seen: set[frozenset[str]] = set()
    for plan in evaluated:
        signature = frozenset(plan["stores"]) | frozenset(plan["extra_stores"])
        if signature in seen:
            continue
        seen.add(signature)
        plans.append(plan)
    plans = plans[:5]
    recommended = plans[0] if plans else None

    savings = baseline["total"] - recommended["total"] if recommended else 0
    stores_saved = baseline["store_count"] - recommended["store_count"] if recommended else 0

    return {
        "status": "ok",
        "shipping_cost_per_store": shipping_cost,
        "baseline": baseline,
        "plans": plans,
        "recommended": recommended,
        "savings": savings,
        "stores_saved": stores_saved,
    }


def teaser(plan_result: Dict[str, Any]) -> Dict[str, Any]:
    """Versión para usuarios sin plan pagado: el ahorro, sin el detalle."""
    recommended = plan_result.get("recommended")
    return {
        "status": plan_result.get("status"),
        "locked": True,
        "shipping_cost_per_store": plan_result.get("shipping_cost_per_store"),
        "baseline": {
            "store_count": (plan_result.get("baseline") or {}).get("store_count"),
            "total": (plan_result.get("baseline") or {}).get("total"),
        } if plan_result.get("baseline") else None,
        "savings": plan_result.get("savings", 0),
        "stores_saved": plan_result.get("stores_saved", 0),
        "store_count": recommended.get("store_count") if recommended else None,
        "plans": [],
        "recommended": None,
    }
