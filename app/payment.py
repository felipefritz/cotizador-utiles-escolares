"""
Integración con Mercado Pago para procesar pagos
"""
import os
import json
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database import Payment, Subscription, Plan, PaymentStatus, SubscriptionStatus

# Mercado Pago SDK
try:
    import mercadopago
    MP_CONFIGURED = True
except ImportError:
    MP_CONFIGURED = False
    mercadopago = None

# Configuración
MERCADO_PAGO_ACCESS_TOKEN = os.getenv("MERCADO_PAGO_ACCESS_TOKEN", "")
MERCADO_PAGO_PUBLIC_KEY = os.getenv("MERCADO_PAGO_PUBLIC_KEY", "")
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

# URLs de Mercado Pago
MP_API_URL = "https://api.mercadopago.com"


def initialize_mercado_pago():
    """Inicializa cliente de Mercado Pago"""
    if not MERCADO_PAGO_ACCESS_TOKEN:
        print("⚠️ MERCADO_PAGO_ACCESS_TOKEN no configurado")
        return None
    
    try:
        sdk = mercadopago.SDK(MERCADO_PAGO_ACCESS_TOKEN)
        return sdk
    except Exception as e:
        print(f"❌ Error inicializando Mercado Pago SDK: {e}")
        return None


def create_payment_preference(plan: Plan, user_id: int, db: Session) -> Optional[dict]:
    """
    Crea una preferencia de pago en Mercado Pago
    Retorna: {'id': 'preference_id', 'init_point': 'url_checkout'}
    """
    if not MERCADO_PAGO_ACCESS_TOKEN:
        print("❌ Mercado Pago no configurado")
        return None
    
    try:
        sdk = initialize_mercado_pago()
        if not sdk:
            return None
        
        # Datos de la preferencia
        preference_data = {
            "items": [
                {
                    "title": f"Plan {plan.name.upper()} - Cotizador Útiles",
                    "quantity": 1,
                    "currency_id": "CLP",
                    "unit_price": int(plan.price),
                }
            ],
            "payer": {
                "email": "",  # Se obtendrá del usuario después
            },
            "back_urls": {
                "success": f"{BASE_URL}/#/dashboard?payment=success",
                "failure": f"{BASE_URL}/#/dashboard?payment=failure",
                "pending": f"{BASE_URL}/#/dashboard?payment=pending",
            },
            "auto_return": "approved",
            "external_reference": f"user_{user_id}_plan_{plan.id}_{int(datetime.utcnow().timestamp())}",
            "notification_url": f"{BASE_URL.replace('http://', 'https://')}/api/payment/webhook",
        }
        
        # Crear preferencia (sin request_options que causa error en SDK 2.3.0)
        preference_response = sdk.preference().create(preference_data)
        
        if preference_response.get("status") == 201:
            preference = preference_response["response"]
            preference_id = preference.get("id")
            init_point = preference.get("init_point")
            
            print(f"✅ Preferencia creada: {preference_id}")
            
            # Guardar pago en base de datos como pendiente
            payment = Payment(
                user_id=user_id,
                plan_id=plan.id,
                amount=plan.price,
                status=PaymentStatus.pending,
                mercado_pago_id=preference_id,
                reference=preference.get("external_reference"),
            )
            db.add(payment)
            db.commit()
            
            return {
                "id": preference_id,
                "init_point": init_point,
                "checkout_pro_url": init_point,
            }
        else:
            print(f"❌ Error creando preferencia: {preference_response}")
            return None
            
    except Exception as e:
        print(f"❌ Error en create_payment_preference: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_payment_status(payment_id: str) -> Optional[str]:
    """
    Obtiene el estado de un pago desde Mercado Pago
    Retorna: 'pending', 'approved', 'rejected', etc.
    """
    if not MERCADO_PAGO_ACCESS_TOKEN:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {MERCADO_PAGO_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{MP_API_URL}/v1/payments/{payment_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json().get("status")
        else:
            print(f"❌ Error obteniendo pago: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error en get_payment_status: {e}")
        return None


def verify_payment(mercado_pago_id: str, db: Session) -> bool:
    """
    Verifica el estado de un pago en Mercado Pago
    Retorna True si fue aprobado
    """
    if not MERCADO_PAGO_ACCESS_TOKEN:
        return False
    
    try:
        status = get_payment_status(mercado_pago_id)
        print(f"📊 Estado del pago {mercado_pago_id}: {status}")
        
        # Estados de Mercado Pago:
        # pending - Pago en proceso
        # approved - Pago aprobado ✅
        # authorized - Pago autorizado
        # in_process - Pago en revisión
        # in_mediation - Disputa
        # rejected - Rechazado
        # cancelled - Cancelado
        # refunded - Reembolsado
        # charged_back - Contracargo
        
        return status == "approved"
    except Exception as e:
        print(f"❌ Error verificando pago: {e}")
        return False


def process_webhook(data: dict, db: Session) -> bool:
    """
    Procesa webhook de Mercado Pago
    Se llama cuando hay cambios de estado en los pagos
    """
    try:
        print(f"🔔 Webhook recibido: {data}")
        
        action = data.get("action")
        data_obj = data.get("data", {})
        payment_id = data_obj.get("id")
        
        if not payment_id:
            print("⚠️ No hay payment_id en el webhook")
            return False
        
        # Obtener info del pago desde Mercado Pago
        status = get_payment_status(str(payment_id))
        
        if not status:
            print("❌ No se pudo obtener el estado del pago")
            return False
        
        # Buscar pago en base de datos
        payment = db.query(Payment).filter(
            Payment.mercado_pago_id == str(payment_id)
        ).first()
        
        if not payment:
            print(f"⚠️ Pago {payment_id} no encontrado en BD")
            return False
        
        print(f"💾 Pago encontrado en BD: {payment.id}")
        
        # Actualizar estado del pago
        if status == "approved":
            print(f"✅ Pago {payment_id} APROBADO")
            payment.status = PaymentStatus.completed
            
            # Crear o actualizar suscripción
            subscription = db.query(Subscription).filter(
                Subscription.user_id == payment.user_id
            ).first()
            
            plan = db.query(Plan).filter(Plan.id == payment.plan_id).first()
            if not plan:
                print(f"❌ Plan {payment.plan_id} no encontrado")
                return False
            
            now = datetime.utcnow()
            expires_at = now + timedelta(days=30) if plan.billing_cycle == "monthly" else None
            
            if subscription:
                subscription.plan_id = plan.id
                subscription.status = SubscriptionStatus.active
                subscription.started_at = now
                subscription.expires_at = expires_at
                subscription.updated_at = now
                print(f"🔄 Suscripción actualizada para usuario {payment.user_id}")
            else:
                subscription = Subscription(
                    user_id=payment.user_id,
                    plan_id=plan.id,
                    status=SubscriptionStatus.active,
                    started_at=now,
                    expires_at=expires_at,
                )
                db.add(subscription)
                print(f"✨ Suscripción creada para usuario {payment.user_id}")
            
        elif status in ["rejected", "cancelled"]:
            print(f"❌ Pago {payment_id} RECHAZADO")
            payment.status = PaymentStatus.failed
        elif status == "pending":
            print(f"⏳ Pago {payment_id} PENDIENTE")
            payment.status = PaymentStatus.pending
        
        db.commit()
        print(f"✅ Webhook procesado exitosamente")
        return True
    
    except Exception as e:
        print(f"❌ Error procesando webhook: {e}")
        import traceback
        traceback.print_exc()
        return False


def get_user_subscription(user_id: int, db: Session) -> Optional[dict]:
    """Obtiene la suscripción activa del usuario"""
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        
        if not subscription:
            return None
        
        # Verificar si expiró
        if subscription.expires_at and subscription.expires_at < datetime.utcnow():
            subscription.status = SubscriptionStatus.expired
            db.commit()
            return None
        
        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
        
        return {
            "id": subscription.id,
            "plan_name": plan.name,
            "plan_id": plan.id,
            "status": subscription.status.value,
            "started_at": subscription.started_at.isoformat(),
            "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
            "max_items": plan.max_items,
            "max_providers": plan.max_providers,
            "monthly_limit": plan.monthly_limit,
        }
    except Exception as e:
        print(f"❌ Error getting user subscription: {e}")
        return None


def has_active_subscription(user_id: int, db: Session) -> bool:
    """Verifica si el usuario tiene suscripción activa"""
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.active,
        ).first()
        
        if not subscription:
            return False
        
        # Verificar que no esté expirada
        if subscription.expires_at and subscription.expires_at < datetime.utcnow():
            subscription.status = SubscriptionStatus.expired
            db.commit()
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error checking subscription: {e}")
        return False


def get_user_limits(user_id: int, db: Session) -> dict:
    """Obtiene los límites del usuario según su plan"""
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        
        if not subscription:
            # Usuario sin suscripción - plan free
            free_plan = db.query(Plan).filter(Plan.name == "free").first()
            if free_plan:
                return {
                    "max_items": free_plan.max_items,
                    "max_providers": free_plan.max_providers,
                    "monthly_limit": free_plan.monthly_limit,
                }
        else:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if plan:
                return {
                    "max_items": plan.max_items,
                    "max_providers": plan.max_providers,
                    "monthly_limit": plan.monthly_limit,
                }
        
        # Valores por defecto (plan free)
        return {"max_items": 5, "max_providers": 2, "monthly_limit": None}
    
    except Exception as e:
        print(f"❌ Error getting user limits: {e}")
        return {"max_items": 5, "max_providers": 2, "monthly_limit": None}
