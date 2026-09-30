"""Flujo completo por API, como lo recorre un usuario.

Lista escolar real (DOCX) -> ítems -> cotización por ítem -> plan de compra,
con un catálogo grabado de títulos y precios observados en las tiendas durante
la validación en vivo de septiembre de 2026. Las tiendas WooCommerce devuelven
cero para consultas con cifras o plurales, igual que en vivo, así que el flujo
también ejercita las consultas de respaldo.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import pytest
from fastapi.testclient import TestClient

from app import main
from app.database import AppSetting, SessionLocal
from app.quoting import multi_provider


ROOT = Path(__file__).resolve().parents[1]

# (tienda, consulta exacta) -> títulos y precios grabados
CATALOG: Dict[tuple, List[Dict[str, Any]]] = {
    ("librerianene", "cuadernos universitarios 100 hojas matemática 7 mm"): [
        {"title": "FORRO CUADERNO UNIVERSITARIO AMARILLO.", "price": 650},
        {"title": "CUADERNO UNIVERSITARIO TORRE 100hj MATEMATICA 7mm", "price": 2150},
    ],
    ("librerianene", "cuaderno universitario 100 hojas cuadro grande"): [
        {"title": "CUADERNO UNIVERSITARIO 100hj CUADRO GRANDE TORRE", "price": 1990},
    ],
    ("librerianene", "lápices de colores 12 unidades"): [
        {"title": "LAPICES COLORES 12col. LARGO KREARTE", "price": 1190},
    ],
    ("librerianene", "tijera punta roma"): [
        {"title": 'TIJERA ESCOLAR PTA ROMA 13,5 cm 5 1/4" KREARTE', "price": 790},
    ],
    ("librerianene", "goma de borrar"): [
        {"title": "GOMA DE BORRAR MIGA PELIKAN", "price": 350},
    ],
    # WooCommerce: cero con cifras; responde a la consulta simplificada.
    ("torre", "cuaderno universitario"): [
        {"title": "Cuaderno Universitario Stranger Things 7 mm 100 Hojas Torre", "price": 1690},
    ],
    ("torre", "lápices"): [
        {"title": "Lápices de Colores Triangulares 12 Colores", "price": 2490},
    ],
    ("torre", "tijera punta"): [
        {"title": "Tijera Escolar Punta Roma Torre", "price": 990, "available": False},
    ],
    ("torre", "goma borrar"): [
        {"title": "Goma de Borrar Torre", "price": 290},
    ],
    ("torre", "pegamento barra"): [
        {"title": "Pegamento en barra 40 gr Torre", "price": 1290},
    ],
}


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    multi_provider.clear_cache()
    # Los archivos subidos no deben ensuciar `uploads/` del repositorio.
    monkeypatch.setattr(main, "UPLOAD_DIR", tmp_path)
    calls: List[str] = []

    def replay(provider: str, query: str, limit: int = 5) -> Dict[str, Any]:
        calls.append(f"{provider}:{query}")
        hits = [
            {"url": f"https://{provider}.test/{i}", "available": True, "provider": provider, **hit}
            for i, hit in enumerate(CATALOG.get((provider, query), []))
        ]
        return {"query": query, "status": "ok" if hits else "not_found", "hits": hits, "error": None}

    monkeypatch.setattr(multi_provider, "quote_structured_store", replay)
    with TestClient(main.app) as test_client:
        db = SessionLocal()
        try:
            setting = db.query(AppSetting).filter(AppSetting.key == "plans_enabled").first()
            if setting:
                setting.value = "false"
            else:
                db.add(AppSetting(key="plans_enabled", value="false"))
            db.commit()
        finally:
            db.close()
        test_client.calls = calls
        yield test_client
    multi_provider.clear_cache()


def test_school_list_from_upload_to_purchase_plan(client: TestClient) -> None:
    docx = ROOT / "uploads" / "23352859a9304dc3875b065ffbba9a20.docx"
    if not docx.exists():
        pytest.skip("lista de ejemplo no disponible")

    with docx.open("rb") as handle:
        parsed = client.post("/api/parse-ai-items-only", files={"file": ("lista.docx", handle)})
    assert parsed.status_code == 200
    items = parsed.json()["items"]
    assert len(items) == 12
    assert all(item["tipo"] == "producto" for item in items)

    quoted = []
    for item in items:
        response = client.post(
            "/api/quote/multi-providers",
            json={"query": item["detalle"], "area": "educacion", "providers": ["librerianene", "torre"]},
        )
        assert response.status_code == 200, response.text
        quoted.append((item, response.json()))

    by_query = {item["detalle"]: result for item, result in quoted}

    # El forro barato no reemplaza al cuaderno.
    notebook = by_query["cuadernos universitarios 100 hojas matemática 7 mm"]["hits"][0]
    assert notebook["title"].startswith("CUADERNO UNIVERSITARIO")

    # Torre (WooCommerce) aporta gracias a la consulta simplificada.
    eraser = by_query["goma de borrar"]["hits"]
    assert eraser[0]["provider"] == "torre" and eraser[0]["price"] == 290
    assert "torre:goma borrar" in client.calls

    # La tijera más barata está agotada: se prefiere la que tiene stock.
    scissors = by_query["tijera punta roma"]["hits"]
    assert scissors[0]["available"] is True and scissors[0]["price"] == 790

    # Sin resultados relevantes no se inventa un precio.
    ruler = by_query["regla de 30 cm"]
    assert ruler["status"] == "no_results" and ruler["hits"] == []

    plan = client.post("/api/quote/purchase-plan", json={
        "items": [
            {"detalle": item["detalle"], "cantidad": item["cantidad"], "hits": result["hits"]}
            for item, result in quoted
        ],
    })
    assert plan.status_code == 200
    body = plan.json()
    assert body["status"] == "ok"
    assert body["recommended"]["total"] >= body["recommended"]["subtotal"]
    assert {"detalle": "regla de 30 cm", "cantidad": 1, "reason": "sin_precio"} in body["recommended"]["missing"]


def test_batch_endpoint_reports_each_item(client: TestClient) -> None:
    response = client.post("/api/quote/multi-providers/batch", json={
        "items": [{"detalle": "tijera punta roma", "cantidad": 2}, {"detalle": "compás metálico", "cantidad": 1}],
        "area": "educacion",
        "providers": ["librerianene", "torre"],
    })
    assert response.status_code == 200
    first, second = response.json()["items"]
    assert first["quote"]["unit_price"] == 790 and first["quote"]["line_total"] == 1580
    assert second["quote"]["status"] == "no_results"
