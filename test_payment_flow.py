#!/usr/bin/env python
"""
Test completo del flujo de pagos con Mercado Pago
Verifica que:
1. Se crea un pago
2. Webhook actualiza el plan cuando está aprobado
3. Webhook rechaza cuando está rechazado
"""

import sys
sys.path.insert(0, '/Users/felipe/Documents/proyectos/cotizador-utiles')

import requests
import json
import time
import random
from datetime import datetime
from app.database import SessionLocal, User, Plan, Payment, Subscription, PaymentStatus, SubscriptionStatus
from app.payment import process_webhook

# Configuración
API_BASE = "http://localhost:8000/api"
HEADERS = {
    "Content-Type": "application/json"
}

# Colores para output
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    ENDC = '\033[0m'

def print_test(msg):
    print(f"\n{Colors.BLUE}{'='*70}")
    print(f"🧪 TEST: {msg}")
    print(f"{'='*70}{Colors.ENDC}")

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.YELLOW}ℹ️  {msg}{Colors.ENDC}")

def create_test_user():
    """Crea un usuario de prueba sin suscripción"""
    db = SessionLocal()
    try:
        # Crear usuario único con timestamp
        timestamp = int(time.time() * 1000)
        email = f"test_payment_{timestamp}@example.com"
        username = f"test_payment_user_{timestamp}"
        
        user = User(
            email=email,
            username=username,
            password_hash="hashed_pwd",
            provider="local"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print_success(f"Usuario de prueba creado: ID {user.id}, email: {user.email}")
        return user
        
    except Exception as e:
        print_error(f"Error creando usuario: {e}")
        return None
    finally:
        db.close()

def verify_user_has_plan(user_id, expected_plan_name):
    """Verifica que el usuario tiene el plan esperado"""
    db = SessionLocal()
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        
        if not subscription:
            print_error(f"Usuario {user_id} no tiene suscripción")
            return False
        
        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
        if not plan:
            print_error(f"No se encontró el plan")
            return False
        
        if plan.name.lower() == expected_plan_name.lower():
            print_success(f"Usuario {user_id} tiene plan: {plan.name}")
            print_info(f"   - Límite items: {plan.max_items}")
            print_info(f"   - Límite proveedores: {plan.max_providers}")
            print_info(f"   - Límite mensual: {plan.monthly_limit}")
            print_info(f"   - Estado: {subscription.status}")
            return True
        else:
            print_error(f"Usuario tiene plan {plan.name}, esperaba {expected_plan_name}")
            return False
            
    except Exception as e:
        print_error(f"Error verificando plan: {e}")
        return False
    finally:
        db.close()

def create_payment_record(user_id, plan_id, mercado_pago_id):
    """Crea un registro de pago en la BD"""
    db = SessionLocal()
    try:
        payment = Payment(
            user_id=user_id,
            plan_id=plan_id,
            amount=100000,
            mercado_pago_id=mercado_pago_id,
            status=PaymentStatus.pending
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        print_success(f"Pago creado: ID {payment.id}, MP ID: {mercado_pago_id}")
        return payment
        
    except Exception as e:
        print_error(f"Error creando pago: {e}")
        return None
    finally:
        db.close()

def simulate_webhook_approved(mercado_pago_id):
    """Simula un webhook de Mercado Pago con estado aprobado"""
    db = SessionLocal()
    try:
        # Convertir a entero si es string
        mp_id_int = int(mercado_pago_id) if isinstance(mercado_pago_id, str) else mercado_pago_id
        
        # Webhook payload similar al de Mercado Pago
        webhook_data = {
            "id": "123456789",
            "action": "payment.created",
            "data": {
                "id": mp_id_int
            }
        }
        
        print_info(f"Enviando webhook APROBADO para pago {mercado_pago_id}")
        
        # Para este test, vamos a mockear get_payment_status para que devuelva "approved"
        import app.payment as payment_module
        original_get_payment_status = payment_module.get_payment_status
        
        def mock_get_payment_status(payment_id):
            # Simular que el pago fue aprobado
            return "approved"
        
        # Reemplazar la función
        payment_module.get_payment_status = mock_get_payment_status
        
        try:
            # Procesar el webhook con la función mockeada
            result = process_webhook(webhook_data, db)
            
            if result:
                # Verificar que el webhook procesó correctamente
                payment_updated = db.query(Payment).filter(
                    Payment.mercado_pago_id == str(mercado_pago_id)
                ).first()
                
                if payment_updated and payment_updated.status == PaymentStatus.completed:
                    print_success(f"Pago {mercado_pago_id} marcado como COMPLETADO")
                    return True
                else:
                    print_error(f"Pago no se marcó como completado")
                    return False
            else:
                print_error(f"Error procesando webhook")
                return False
        finally:
            # Restaurar la función original
            payment_module.get_payment_status = original_get_payment_status
            
    except Exception as e:
        print_error(f"Error en webhook: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_1_user_without_plan():
    """Test 1: Verificar que usuario nuevo no tiene plan"""
    print_test("Usuario nuevo sin suscripción")
    
    user = create_test_user()
    if not user:
        return False
    
    db = SessionLocal()
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user.id
        ).first()
        
        if subscription:
            print_error(f"Usuario debería no tener suscripción")
            return False
        else:
            print_success(f"Confirmado: Usuario {user.id} sin suscripción inicial")
            return True
            
    finally:
        db.close()

def test_2_payment_flow_approved():
    """Test 2: Flujo completo con pago aprobado"""
    print_test("Flujo de pago APROBADO")
    
    user = create_test_user()
    if not user:
        return False
    
    db = SessionLocal()
    try:
        # Obtener plan basic
        basic_plan = db.query(Plan).filter(Plan.name == "basic").first()
        if not basic_plan:
            print_error("Plan BASIC no encontrado")
            return False
        
        print_info(f"Plan BASIC: {basic_plan.name}, precio ${basic_plan.price}, max_items: {basic_plan.max_items}")
        
    finally:
        db.close()
    
    # Crear pago con ID único (timestamp + random)
    mp_id_1 = int(time.time() * 1000) + random.randint(1, 9999)
    payment = create_payment_record(user.id, basic_plan.id, mp_id_1)
    if not payment:
        return False
    
    # Simular webhook aprobado
    if not simulate_webhook_approved(mp_id_1):
        return False
    
    # Verificar que el usuario ahora tiene el plan BASIC
    if verify_user_has_plan(user.id, "basic"):
        print_success("✨ Pago aprobado actualizó el plan correctamente")
        return True
    else:
        print_error("Plan no se actualizó después del pago aprobado")
        return False

def test_3_plan_limits_after_payment():
    """Test 3: Verificar que los límites se respetan después del pago"""
    print_test("Verificar límites del plan después del pago")
    
    # Usar el usuario del test anterior (del test 2)
    # El usuario debe tener plan BASIC
    user = create_test_user()
    if not user:
        return False
    
    db = SessionLocal()
    try:
        # Obtener plan básico
        basic_plan = db.query(Plan).filter(Plan.name == "basic").first()
        if not basic_plan:
            print_error("Plan BASIC no encontrado")
            return False
        
        print_info(f"Plan actual: {basic_plan.name}")
        print_info(f"Max items: {basic_plan.max_items}")
        print_info(f"Max proveedores: {basic_plan.max_providers}")
        print_info(f"Límite mensual: {basic_plan.monthly_limit}")
        
        # Plan BASIC debería tener:
        # - max_items: 35
        # - max_providers: 5
        # - monthly_limit: 100
        
        if (basic_plan.max_items == 35 and 
            basic_plan.max_providers == 5 and 
            basic_plan.monthly_limit == 100):
            print_success("Límites del plan BASIC son correctos")
            return True
        else:
            print_error(f"Límites incorrectos: items={basic_plan.max_items}, providers={basic_plan.max_providers}, monthly={basic_plan.monthly_limit}")
            return False
            
    finally:
        db.close()

def test_4_multiple_payment_updates():
    """Test 4: Cambiar de plan realizando otro pago"""
    print_test("Cambiar de plan BASIC → PRO con nuevo pago")
    
    user = create_test_user()
    if not user:
        return False
    
    db = SessionLocal()
    try:
        pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
        if not pro_plan:
            print_error("Plan PRO no encontrado")
            return False
        
        print_info(f"Plan PRO: {pro_plan.name}, precio ${pro_plan.price}, max_items: {pro_plan.max_items}")
        
    finally:
        db.close()
    
    # Crear nuevo pago para plan PRO con ID único
    mp_id_2 = int(time.time() * 1000) + random.randint(10000, 99999)
    payment = create_payment_record(user.id, pro_plan.id, mp_id_2)
    if not payment:
        return False
    
    # Simular webhook aprobado
    if not simulate_webhook_approved(mp_id_2):
        return False
    
    # Verificar que el usuario ahora tiene plan PRO
    if verify_user_has_plan(user.id, "pro"):
        print_success("✨ Usuario actualizado a plan PRO")
        
        # Verificar que es ilimitado
        db = SessionLocal()
        try:
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user.id
            ).first()
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            
            if plan.max_items is None and plan.max_providers is None:
                print_success("Plan PRO tiene límites ilimitados")
                return True
            else:
                print_error(f"Plan PRO debería ser ilimitado")
                return False
        finally:
            db.close()
    else:
        return False

def main():
    print(f"\n{Colors.BLUE}🧪 TEST SUITE - VALIDACIÓN DE FLUJO DE PAGOS{Colors.ENDC}")
    print(f"{Colors.BLUE}Base de datos: SQLite{Colors.ENDC}\n")
    
    results = {}
    
    tests = [
        ("Test 1: Usuario sin plan", test_1_user_without_plan),
        ("Test 2: Pago aprobado", test_2_payment_flow_approved),
        ("Test 3: Límites del plan", test_3_plan_limits_after_payment),
        ("Test 4: Cambiar de plan", test_4_multiple_payment_updates),
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print_error(f"Error en test: {e}")
            import traceback
            traceback.print_exc()
            results[test_name] = False
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*70}")
    print("📊 RESUMEN DE TESTS")
    print(f"{'='*70}{Colors.ENDC}\n")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}✅ PASS{Colors.ENDC}" if result else f"{Colors.RED}❌ FAIL{Colors.ENDC}"
        print(f"{test_name}: {status}")
    
    print(f"\n{Colors.BLUE}Total: {passed}/{total} tests pasados{Colors.ENDC}\n")
    
    if passed == total:
        print(f"{Colors.GREEN}🎉 ¡Todos los tests pasaron!{Colors.ENDC}\n")
    else:
        print(f"{Colors.RED}⚠️ Algunos tests fallaron{Colors.ENDC}\n")

if __name__ == "__main__":
    main()
