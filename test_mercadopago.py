#!/usr/bin/env python3
"""
Script de prueba para verificar la configuración de Mercado Pago
"""
import os
from dotenv import load_dotenv

load_dotenv()

def test_mercadopago_config():
    """Verifica que las credenciales estén configuradas"""
    print("🔍 Verificando configuración de Mercado Pago...\n")
    
    access_token = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
    public_key = os.getenv("MERCADO_PAGO_PUBLIC_KEY")
    base_url = os.getenv("BASE_URL")
    
    if not access_token:
        print("❌ MERCADO_PAGO_ACCESS_TOKEN no configurado")
        return False
    else:
        print(f"✅ MERCADO_PAGO_ACCESS_TOKEN: {access_token[:20]}...")
    
    if not public_key:
        print("❌ MERCADO_PAGO_PUBLIC_KEY no configurado")
        return False
    else:
        print(f"✅ MERCADO_PAGO_PUBLIC_KEY: {public_key[:20]}...")
    
    if not base_url:
        print("⚠️  BASE_URL no configurado (usando default)")
    else:
        print(f"✅ BASE_URL: {base_url}")
    
    print("\n🧪 Probando conexión con Mercado Pago API...\n")
    
    try:
        import requests
        
        # Probar autenticación
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            "https://api.mercadopago.com/v1/payment_methods",
            headers=headers
        )
        
        if response.status_code == 200:
            methods = response.json()
            print(f"✅ Conexión exitosa con Mercado Pago")
            print(f"✅ Métodos de pago disponibles: {len(methods)}")
            print(f"✅ Access Token es válido")
            
            # Verificar si es TEST o PRODUCTION
            if "TEST" in access_token:
                print(f"ℹ️  Modo: PRUEBA (sin dinero real)")
            else:
                print(f"💰 Modo: PRODUCCIÓN (dinero real)")
            
            return True
        else:
            print(f"❌ Error de autenticación: {response.status_code}")
            print(f"❌ Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_create_preference():
    """Prueba crear una preferencia de pago"""
    print("\n🧪 Probando creación de preferencia de pago...\n")
    
    try:
        from mercadopago import SDK
        access_token = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
        
        sdk = SDK(access_token)
        
        preference_data = {
            "items": [
                {
                    "title": "TEST - Plan Basic",
                    "quantity": 1,
                    "currency_id": "CLP",
                    "unit_price": 4990,
                }
            ],
            "back_urls": {
                "success": "http://localhost:3000/success",
                "failure": "http://localhost:3000/failure",
                "pending": "http://localhost:3000/pending",
            },
            "external_reference": "test_123",
        }
        
        response = sdk.preference().create(preference_data)
        
        if response.get("status") == 201:
            pref_id = response["response"]["id"]
            init_point = response["response"]["init_point"]
            print(f"✅ Preferencia creada exitosamente")
            print(f"✅ ID: {pref_id}")
            print(f"✅ Checkout URL: {init_point}")
            print(f"\n🎉 ¡Mercado Pago está funcionando correctamente!")
            return True
        else:
            print(f"❌ Error creando preferencia: {response}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("  TEST DE MERCADO PAGO")
    print("=" * 60)
    
    if test_mercadopago_config():
        test_create_preference()
    else:
        print("\n❌ Configuración incorrecta. Verifica tus credenciales en .env")
    
    print("\n" + "=" * 60)
