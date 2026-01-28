"""
Integración con Mercado Pago para procesar pagos
"""
import os
import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.database import Payment, Subscription, Plan, PaymentStatus, SubscriptionStatus

# Mercado Pago SDK
try:
    import mercado_pago
    MP_CONFIGURED = True
except ImportError:
    MP_CONFIGURED = False

# Configuración
MERCADO_PAGO_ACCESS_TOKEN = os.getenv("MERCADO_PAGO_ACCESS_TOKEN", "")
MERCADO_PAGO_PUBLIC_KEY = os.getenv("MERCADO_PAGO_PUBLIC_KEY", "")
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")


def initialize_mercado_pago():
    """Inicializa cliente de Mercado Pago"""
    if not MP_CONFIGURED or not MERCADO_PAGO_ACCESS_TOKEN:
        return None
    
    sdk = mercado_pago.SDK(MERCADO_PAGO_ACCESS_TOKEN)
    return sdk


def create_payment_preference(plan: Plan, user_id: int, db: Session) -> Optional[dict]:
    """
    Crea una preferencia de pago en Mercado Pago
    Retorna: {'id': 'preference_id', 'init_point': 'url_checkout'}
    """
    if not MP_CONFIGURED or not MERCADO_PAGO_ACCESS_TOKEN:
        return None
    
    sdk = initialize_mercado_pago()
    if not sdk:
        return None
    
    try:
        preference_data = {
            "items": [
                {
                    "title": f"Plan {plan.name.upper()} - {plan.billing_cycle}",
                    "quantity": 1,
                    "currency_id": "CLP",
                    "unit_price": plan.price,
                }
            ],
            "payer": {
                "email": "",  # Se obtendrá del usuario después
            },
            "back_urls": {
                "success": f"{BASE_URL}/payment/success",
                "failure": f"{BASE_URL}/payment/failure",
                "pending": f"{BASE_URL}/payment/pending",
            },
            "auto_return": "approved",
            "external_reference": f"user_{user_id}_plan_{plan.id}_{datetime.utcnow().timestamp()}",
        }
        
        preference_response = sdk.preference().create(preference_data)
        
        if preference_response.get("status") == 201:
            preference_id = preference_response["response"]["id"]
            init_point = preference_response["response"]["init_point"]
            
            # Guardar pago en base de datos como pendiente
            payment = Payment(
                user_id=user_id,
                plan_id=plan.id,
                amount=plan.price,
                status=PaymentStatus.pending,
                mercado_pago_id=preference_id,
                reference=preference_response["response"].get("external_reference"),
            )
            db.add(payment)
            db.commit()
            
            return {
                "id": preference_id,
                "init_point": init_point,
                "checkout_pro_url": init_point,
            }
        else:
            print(f"Error creating preference: {preference_response}")
            return None
            
    except Exception as e:
        print(f"Error en create_payment_preference: {e}")
        return None


def verify_payment(mercado_pago_id: str, db: Session) -> bool:
    """
    Verifica el estado de un pago en Mercado Pago
    Retorna True si fue aprobado
    """
    if not MP_CONFIGURED or not MERCADO_PAGO_ACCESS_TOKEN:
        return False
    
    sdk = initialize_mercado_pago()
    if not sdk:
        return False
    
    try:
        payment_info = sdk.payment().get(mercado_pago_id)
        
        if payment_info.get("status") == 200:
            status = payment_info["response"].get("status")
            
            # Estados de Mercado Pago:
            # pending - Pago en proceso
            # approved - Pago aprobado
            # authorized - Pago autorizado
            # in_process - Pago en revisión
            # in_mediation - Disputa
            # rejected - Rechazado
            # cancelled - Cancelado
            # refunded - Reembolsado
            # charged_back - Contracargo
            
            if status == "approved":
                return True
        
        return False
    except Exception as e:
        print(f"Error verifying payment: {e}")
        return False


def process_webhook(data: dict, db: Session) -> bool:
    """
    Procesa webhook de Mercado Pago
    Se llama cuando hay cambios de estado en los pagos
    """
    try:
        topic = data.get("topic")
        resource_id = data.get("resource")
        
        if topic == "payment":
            # Obtener info del pago de Mercado Pago
            sdk = initialize_mercado_pago()
            if not sdk:
                return False
            
            payment_info = sdk.payment().get(resource_id)
            
            if payment_info.get("status") == 200:
                mp_payment = payment_info["response"]
                status = mp_payment.get("status")
                external_reference = mp_payment.get("external_reference")
                
                # Buscar pago en base de datos
                payment = db.query(Payment).filter(
                    Payment.mercado_pago_id == str(resource_id)
                ).first()
                
                if not payment:
                    return False
                
                # Actualizar estado del pago
                if status == "approved":
                    payment.status = PaymentStatus.completed
                    
                    # Crear o actualizar suscripción
                    subscription = db.query(Subscription).filter(
                        Subscription.user_id == payment.user_id
                    ).first()
                    
                    plan = db.query(Plan).filter(Plan.id == payment.plan_id).first()
                    if not plan:
                        return False
                    
                    now = datetime.utcnow()
                    expires_at = now + timedelta(days=30) if plan.billing_cycle == "monthly" else None
                    
                    if subscription:
                        subscription.plan_id = plan.id
                        subscription.status = SubscriptionStatus.active
                        subscription.started_at = now
                        subscription.expires_at = expires_at
                        subscription.updated_at = now
                    else:
                        subscription = Subscription(
                            user_id=payment.user_id,
                            plan_id=plan.id,
                            status=SubscriptionStatus.active,
                            started_at=now,
                            expires_at=expires_at,
                        )
                        db.add(subscription)
                    
                elif status in ["rejected", "cancelled"]:
                    payment.status = PaymentStatus.failed
                
                db.commit()
                return True
        
        return False
    
    except Exception as e:
        print(f"Error processing webhook: {e}")
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
        print(f"Error getting user subscription: {e}")
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
        print(f"Error checking subscription: {e}")
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
        print(f"Error getting user limits: {e}")
        return {"max_items": 5, "max_providers": 2, "monthly_limit": None}
