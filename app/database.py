from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Float, JSON, ForeignKey, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import enum

# Usar DATABASE_URL de Railway/Render en producción, SQLite en desarrollo
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cotizador.db")

# Railway/Render usan postgres://, pero SQLAlchemy requiere postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configuración específica para SQLite o PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL no necesita check_same_thread
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)  # Para login con contraseña
    provider = Column(String, nullable=True)  # 'google', 'twitter', 'github', 'local'
    provider_id = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    payments = relationship("Payment", back_populates="user")
    quotes = relationship("SavedQuote", back_populates="user", cascade="all, delete-orphan")


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # 'free', 'basic', 'pro'
    price = Column(Float)  # en CLP
    billing_cycle = Column(String)  # 'monthly', 'yearly', 'lifetime'
    max_items = Column(Integer)  # máximo de items por cotización
    max_providers = Column(Integer)  # máximo de proveedores
    monthly_limit = Column(Integer, default=None)  # límite de cotizaciones/mes (None = ilimitado)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.active)
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    user = relationship("User", back_populates="subscription")
    plan = relationship("Plan", back_populates="subscriptions")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    amount = Column(Float)  # en CLP
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
    mercado_pago_id = Column(String, unique=True, nullable=True)  # ID de Mercado Pago
    reference = Column(String, nullable=True)  # Tu referencia interna
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    user = relationship("User", back_populates="payments")


class SavedQuote(Base):
    __tablename__ = "saved_quotes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String)  # Nombre de la cotización (ej: "Cotización Colegio 1")
    raw_text = Column(Text)  # Texto original parseado
    items = Column(JSON)  # Lista de items parseados
    results = Column(JSON, nullable=True)  # Resultados de cotización (providers + precios)
    notes = Column(Text, nullable=True)  # Notas del usuario
    purchased_items = Column(JSON, nullable=True)  # Items que fueron comprados {item_name: {provider, price, quantity, date}}
    selected_provider = Column(String, nullable=True)  # Proveedor seleccionado para la compra
    is_favorite = Column(Boolean, default=False)
    status = Column(String, default="draft")  # draft, pending, completed, archived
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    user = relationship("User", back_populates="quotes")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    
    # Crear planes por defecto si no existen
    db = SessionLocal()
    try:
        # Verificar si ya existen planes
        from sqlalchemy import text
        result = db.execute(text("SELECT COUNT(*) FROM plans"))
        count = result.scalar()
        
        if count == 0:
            plans = [
                Plan(
                    name="free",
                    price=0,
                    billing_cycle="lifetime",
                    max_items=30,
                    max_providers=3,
                    monthly_limit=None
                ),
                Plan(
                    name="basic",
                    price=4990,  # CLP
                    billing_cycle="monthly",
                    max_items=100,
                    max_providers=10,
                    monthly_limit=100
                ),
                Plan(
                    name="pro",
                    price=14990,  # CLP
                    billing_cycle="monthly",
                    max_items=None,
                    max_providers=None,
                    monthly_limit=None
                ),
            ]
            db.add_all(plans)
            db.commit()
    except Exception as e:
        print(f"Error creating default plans: {e}")
    finally:
        db.close()
