"""
Admin routes for managing plans, users, and analytics.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import func, and_
from pydantic import BaseModel

from app.database import (
    get_db,
    User,
    Plan,
    Subscription,
    Payment,
    SavedQuote,
    PageVisit,
)
from app.auth import get_current_user
from app.settings import get_setting_bool, set_setting_bool

router = APIRouter(prefix="/admin", tags=["admin"])


async def verify_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verify that the current user is an admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder a esta sección",
        )
    return current_user


# ============ PLANS ENDPOINTS ============


@router.get("/plans", response_model=List[dict])
async def get_plans(
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin),
):
    """Get all plans for management."""
    plans = db.query(Plan).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "billing_cycle": p.billing_cycle,
            "max_items": p.max_items,
            "max_providers": p.max_providers,
            "monthly_limit": p.monthly_limit,
        }
        for p in plans
    ]


class PlanUpdateRequest(BaseModel):
    price: float
    max_items: int
    max_providers: int
    monthly_limit: Optional[int] = None


class PlansSettingsUpdate(BaseModel):
    plans_enabled: bool


@router.put("/plans/{plan_id}", response_model=dict)
async def update_plan(
    plan_id: int,
    plan_data: PlanUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin),
):
    """Update a plan's pricing and limits."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    plan.price = plan_data.price
    plan.max_items = plan_data.max_items
    plan.max_providers = plan_data.max_providers
    plan.monthly_limit = plan_data.monthly_limit

    db.commit()
    db.refresh(plan)

    return {
        "id": plan.id,
        "name": plan.name,
        "price": plan.price,
        "billing_cycle": plan.billing_cycle,
        "max_items": plan.max_items,
        "max_providers": plan.max_providers,
        "monthly_limit": plan.monthly_limit,
        "message": "Plan actualizado correctamente",
    }


# ============ USERS ENDPOINTS ============


@router.get("/users", response_model=List[dict])
async def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin),
):
    """Get all registered users with their current plan."""
    users = db.query(User).all()
    result = []
    
    for u in users:
        # Obtener el plan actual del usuario
        subscription = db.query(Subscription).filter(
            Subscription.user_id == u.id
        ).first()
        
        current_plan = None
        if subscription:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if plan:
                current_plan = plan.name.lower()
        
        result.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "provider": u.provider,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "current_plan": current_plan,
        })
    
    return result


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin),
):
    """Delete a user and their data."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Prevent self-deletion
    if user.id == _.id:
        raise HTTPException(
            status_code=400, detail="No puedes eliminarte a ti mismo"
        )

    # Delete related data
    db.query(SavedQuote).filter(SavedQuote.user_id == user_id).delete()
    db.query(Payment).filter(Payment.user_id == user_id).delete()
    db.query(Subscription).filter(Subscription.user_id == user_id).delete()

    # Delete user
    db.delete(user)
    db.commit()

    return {"message": f"Usuario {user.email} eliminado"}


# ============ SETTINGS ENDPOINTS ============


@router.get("/settings/plans", response_model=dict)
async def get_plans_settings(
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin),
):
    """Get plan visibility settings."""
    return {"plans_enabled": get_setting_bool(db, "plans_enabled", True)}


@router.put("/settings/plans", response_model=dict)
async def update_plans_settings(
    settings: PlansSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin),
):
    """Update plan visibility settings."""
    return {"plans_enabled": set_setting_bool(db, "plans_enabled", settings.plans_enabled)}


# ============ ANALYTICS ENDPOINTS ============


@router.get("/analytics", response_model=dict)
async def get_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin),
):
    """Get analytics data: users, subscriptions, visits, revenue."""
    
    # Total users
    total_users = db.query(func.count(User.id)).scalar() or 0

    # Active subscriptions (expires_at > now)
    now = datetime.utcnow()
    active_subscriptions = db.query(func.count(Subscription.id)).filter(
        and_(
            Subscription.status == "active",
            Subscription.expires_at > now,
        )
    ).scalar() or 0

    # Total revenue from payments (completed status)
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == "completed"
    ).scalar() or 0

    # Total visits
    # Usar PageVisit si existe, sino usar SavedQuote como fallback
    try:
        total_visits = db.query(func.count(PageVisit.id)).scalar() or 0
        if total_visits == 0:
            # Fallback a SavedQuote si no hay visitas registradas
            total_visits = db.query(func.count(SavedQuote.id)).scalar() or 0
    except:
        # Fallback si la tabla PageVisit no existe
        total_visits = db.query(func.count(SavedQuote.id)).scalar() or 0

    return {
        "total_users": int(total_users),
        "active_subscriptions": int(active_subscriptions),
        "total_revenue": float(total_revenue),
        "total_visits": int(total_visits),
    }


@router.get("/dashboard")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin),
):
    """Get dashboard summary with key metrics."""
    
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    
    # Total users
    total_users = db.query(func.count(User.id)).scalar() or 0
    
    # New users this week
    new_users_week = db.query(func.count(User.id)).filter(
        User.created_at >= week_ago
    ).scalar() or 0
    
    # Active subscriptions
    active_subs = db.query(func.count(Subscription.id)).filter(
        and_(
            Subscription.status == "active",
            Subscription.expires_at > now,
        )
    ).scalar() or 0
    
    # Total revenue
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == "completed"
    ).scalar() or 0

    # Revenue this week
    revenue_week = db.query(func.sum(Payment.amount)).filter(
        and_(
            Payment.status == "completed",
            Payment.created_at >= week_ago,
        )
    ).scalar() or 0

    # Total visits
    total_visits = db.query(func.count(SavedQuote.id)).scalar() or 0

    # Recent payments
    recent_payments = db.query(Payment).order_by(
        Payment.created_at.desc()
    ).limit(5).all()

    return {
        "metrics": {
            "total_users": int(total_users),
            "new_users_week": int(new_users_week),
            "active_subscriptions": int(active_subs),
            "total_revenue": float(total_revenue),
            "revenue_week": float(revenue_week),
            "total_visits": int(total_visits),
        },
        "recent_payments": [
            {
                "id": p.id,
                "user_email": db.query(User).filter(User.id == p.user_id).first().email if p.user_id else "N/A",
                "amount": float(p.amount),
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in recent_payments
        ],
    }
