"""Los administradores siempre reciben acceso Pro sin restricciones."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, Plan, Subscription, User
from app.payment import get_user_limits, get_user_subscription


def make_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    db.add_all([
        Plan(
            name="free",
            price=0,
            billing_cycle="lifetime",
            max_items=30,
            max_providers=3,
            monthly_limit=None,
        ),
        Plan(
            name="pro",
            price=14990,
            billing_cycle="monthly",
            max_items=None,
            max_providers=None,
            monthly_limit=None,
        ),
    ])
    db.commit()
    return db


def test_admin_without_subscription_is_virtual_pro() -> None:
    db = make_db()
    try:
        admin = User(email="admin@example.com", is_admin=True)
        db.add(admin)
        db.commit()

        assert get_user_limits(admin.id, db) == {
            "max_items": None,
            "max_providers": None,
            "monthly_limit": None,
        }
        subscription = get_user_subscription(admin.id, db)
        assert subscription["plan_name"] == "pro"
        assert subscription["status"] == "active"
        assert subscription["is_admin_override"] is True
        assert subscription["max_items"] is None
        assert subscription["max_providers"] is None
    finally:
        db.close()


def test_admin_with_free_subscription_still_gets_pro() -> None:
    db = make_db()
    try:
        admin = User(email="admin-free@example.com", is_admin=True)
        db.add(admin)
        db.flush()
        free = db.query(Plan).filter(Plan.name == "free").one()
        db.add(Subscription(user_id=admin.id, plan_id=free.id))
        db.commit()

        assert get_user_limits(admin.id, db)["max_providers"] is None
        assert get_user_subscription(admin.id, db)["plan_name"] == "pro"
    finally:
        db.close()


def test_regular_user_without_subscription_keeps_free_limits() -> None:
    db = make_db()
    try:
        user = User(email="free@example.com", is_admin=False)
        db.add(user)
        db.commit()

        assert get_user_limits(user.id, db) == {
            "max_items": 30,
            "max_providers": 3,
            "monthly_limit": None,
        }
    finally:
        db.close()
