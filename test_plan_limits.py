#!/usr/bin/env python3
"""
Script de prueba para validación de límites de plan
Ejecutar: python test_plan_limits.py
"""

import requests
import json
from datetime import datetime

# ============ CONFIGURACIÓN ============
API_BASE = "http://localhost:8000/api"
TOKEN = None  # Se obtiene al hacer login

# Colores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'

def print_test(name):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BLUE}TEST: {name}{Colors.ENDC}")
    print(f"{Colors.BLUE}{'='*60}{Colors.ENDC}")

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.YELLOW}ℹ️  {msg}{Colors.ENDC}")

# ============ HELPERS ============

def get_headers():
    """Obtiene headers con token de autenticación"""
    if not TOKEN:
        print_error("No hay token. Haz login primero.")
        return None
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def make_request(method, endpoint, data=None):
    """Realiza una solicitud HTTP"""
    url = f"{API_BASE}{endpoint}"
    headers = get_headers()
    
    if method == "GET":
        response = requests.get(url, headers=headers)
    elif method == "POST":
        response = requests.post(url, json=data, headers=headers)
    else:
        return None
    
    return response

# ============ TESTS ============

def test_1_get_user_limits():
    """Test 1: Obtener límites del usuario"""
    print_test("Obtener límites del usuario - GET /api/user/limits")
    
    response = make_request("GET", "/user/limits")
    
    if response.status_code == 200:
        data = response.json()
        print_success("Límites obtenidos correctamente")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return data
    else:
        print_error(f"Error: {response.status_code}")
        print(response.text)
        return None

def test_2_save_quote_valid():
    """Test 2: Guardar cotización válida (dentro de límites)"""
    print_test("Guardar cotización válida - POST /api/user/quotes")
    
    payload = {
        "title": "Cotización Test 1",
        "raw_text": "Carpeta azul, Lápiz rojo",
        "items": [
            {"name": "Carpeta azul", "qty": 2},
            {"name": "Lápiz rojo", "qty": 5}
        ],
        "results": {
            "carpeta_azul": {"provider": "dimeiggs", "price": 2000},
            "lapiz_rojo": {"provider": "libreria_nacional", "price": 500}
        }
    }
    
    response = make_request("POST", "/user/quotes", payload)
    
    if response.status_code == 200:
        print_success("Cotización guardada correctamente")
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return data
    else:
        print_error(f"Error: {response.status_code}")
        print(response.text)
        return None

def test_3_save_quote_too_many_items():
    """Test 3: Intentar guardar cotización con demasiados items (plan free = 5)"""
    print_test("Guardar cotización con MUCHOS items (Plan Free = 5) - POST /api/user/quotes")
    
    items = [{"name": f"Item {i}", "qty": 1} for i in range(10)]
    results = {f"item_{i}": {"provider": "dimeiggs", "price": 1000} for i in range(10)}
    
    payload = {
        "title": "Cotización Test - MUCHOS ITEMS",
        "raw_text": "Lista larga de items",
        "items": items,
        "results": results
    }
    
    response = make_request("POST", "/user/quotes", payload)
    
    if response.status_code == 400:
        print_success("Rechazado correctamente - límite de items excedido")
        data = response.json()
        print_info(f"Mensaje: {data.get('detail', 'N/A')}")
    else:
        print_error(f"Error: Se permitió cuando debería rechazarse. Status: {response.status_code}")
        print(response.text)

def test_4_get_subscription():
    """Test 4: Verificar plan actual del usuario"""
    print_test("Verificar plan actual del usuario - GET /api/user/subscription")
    
    response = make_request("GET", "/user/subscription")
    
    if response.status_code == 200:
        data = response.json()
        print_success("Plan obtenido")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return data
    else:
        print_error(f"Error: {response.status_code}")

def test_5_multi_provider_quote():
    """Test 5: Hacer cotización multi-proveedores con limitación"""
    print_test("Cotización multi-proveedores - POST /api/quote/multi-providers")
    
    payload = {
        "query": "carpeta azul",
        "providers": ["dimeiggs", "libreria_nacional"],  # Plan Free permite solo 2
    }
    
    response = make_request("POST", "/quote/multi-providers", payload)
    
    if response.status_code == 200:
        print_success("Cotización multi-provider completada")
        data = response.json()
        print_info(f"Proveedores encontrados: {len(data.get('consolidated', []))}")
        print_info(f"Modo demo: {data.get('is_demo_mode', False)}")
    else:
        print_error(f"Error: {response.status_code}")
        print(response.text)

def test_6_monthly_limit():
    """Test 6: Verificar límite mensual"""
    print_test("Verificar límite mensual - GET /api/user/limits")
    
    response = make_request("GET", "/user/limits")
    
    if response.status_code == 200:
        data = response.json()
        usage = data.get("usage", {})
        monthly_limit = data.get("limits", {}).get("monthly_limit")
        current = usage.get("quotes_this_month", 0)
        remaining = usage.get("monthly_remaining")
        
        print_success("Información de límite mensual obtenida")
        print_info(f"Límite mensual: {monthly_limit}")
        print_info(f"Cotizaciones este mes: {current}")
        print_info(f"Cotizaciones restantes: {remaining}")
        
        if remaining is not None and remaining <= 5:
            print_info(f"⚠️  El usuario está cerca del límite ({remaining} restantes)")
    else:
        print_error(f"Error: {response.status_code}")

# ============ MAIN ============

def main():
    global TOKEN
    
    print(f"\n{Colors.BLUE}🧪 SUITE DE TESTS - VALIDACIÓN DE LÍMITES DE PLAN{Colors.ENDC}")
    print(f"{Colors.BLUE}API: {API_BASE}{Colors.ENDC}\n")
    
    # Obtener token (DEMO: usa tu token real)
    TOKEN = input(f"{Colors.YELLOW}Ingresa tu Bearer Token (o presiona Enter para continuar sin auth): {Colors.ENDC}").strip()
    
    if not TOKEN:
        print_error("Sin token - solo se pueden hacer requests públicos")
    else:
        print_success(f"Token configurado")
    
    # Ejecutar tests
    try:
        limits = test_1_get_user_limits()
        if limits:
            print_info(f"Plan detectado: {limits.get('plan', 'free')}")
            print_info(f"Máx items: {limits['limits'].get('max_items', 5)}")
            print_info(f"Máx proveedores: {limits['limits'].get('max_providers', 2)}")
        
        test_2_save_quote_valid()
        test_3_save_quote_too_many_items()
        test_4_get_subscription()
        test_5_multi_provider_quote()
        test_6_monthly_limit()
        
        print(f"\n{Colors.GREEN}✅ SUITE DE TESTS COMPLETADA{Colors.ENDC}\n")
        
    except KeyboardInterrupt:
        print(f"\n{Colors.RED}Cancelado por usuario{Colors.ENDC}\n")
    except Exception as e:
        print_error(f"Error inesperado: {e}")

if __name__ == "__main__":
    main()
