"""
Seed script for initial data.
Run: python -m scripts.seed
"""
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.models.wallet_type import WalletType

settings = get_settings()


def seed_roles(db):
    """Seed Admin and Staff roles."""
    roles_data = [
        {"name": "admin", "description": "Full system access"},
        {"name": "staff", "description": "Limited access for daily operations"},
    ]

    for role_data in roles_data:
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing:
            role = Role(**role_data)
            db.add(role)
            print(f"  ✓ Created role: {role_data['name']}")
        else:
            print(f"  • Role already exists: {role_data['name']}")

    db.commit()


def seed_admin_user(db):
    """Seed the initial Admin user from SEED_ADMIN_* settings."""
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        print("  ✗ Admin role not found. Run seed_roles first.")
        return

    username = settings.SEED_ADMIN_USERNAME
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        print(f"  • Admin user already exists: {username}")
        return

    password = settings.SEED_ADMIN_PASSWORD
    if not password:
        if settings.is_production:
            raise RuntimeError(
                "SEED_ADMIN_PASSWORD is not set. Refusing to create the initial "
                "admin account with a default password in production. Set it in "
                ".env and restart the backend."
            )
        password = "admin123"
        print("  ! No SEED_ADMIN_PASSWORD set — using the dev default 'admin123'")

    admin_user = User(
        username=username,
        email=settings.SEED_ADMIN_EMAIL,
        hashed_password=get_password_hash(password),
        full_name="System Administrator",
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(admin_user)
    db.commit()
    print(f"  ✓ Created admin user: {username}")


def seed_wallet_types(db):
    """Seed default wallet types."""
    wallet_types_data = [
        # Myanmar (MMK)
        {"name": "Cash", "code": "CASH"},
        {"name": "KPay", "code": "KPAY"},
        {"name": "WavePay", "code": "WAVE"},
        {"name": "AYAPay", "code": "AYAPAY"},
        {"name": "CB Pay", "code": "CBPAY"},
        {"name": "KBZ Bank", "code": "KBZBANK"},
        {"name": "AYA Bank", "code": "AYABANK"},
        {"name": "YOMA Bank", "code": "YOMABANK"},
        {"name": "CB Bank", "code": "CBBANK"},
        {"name": "MAB Bank", "code": "MABBANK"},
        # Thai (THB) — names must match the thai_bank_types lists in the
        # repositories and THB_WALLET_TYPES in the frontend, which both
        # classify a wallet as THB by its wallet type name.
        {"name": "Thai Bank", "code": "THAIBANK"},
        {"name": "KBank", "code": "KBANK"},
        {"name": "BBL", "code": "BBL"},
        {"name": "SCB", "code": "SCB"},
        {"name": "KTB", "code": "KTB"},
        {"name": "TTB", "code": "TTB"},
        {"name": "CIMBT", "code": "CIMBT"},
        {"name": "BAY", "code": "BAY"},
        {"name": "LHBank", "code": "LHBANK"},
        {"name": "KKP", "code": "KKP"},
        {"name": "UOBT", "code": "UOBT"},
    ]

    for wt_data in wallet_types_data:
        existing = db.query(WalletType).filter(WalletType.code == wt_data["code"]).first()
        if not existing:
            wt = WalletType(**wt_data)
            db.add(wt)
            print(f"  ✓ Created wallet type: {wt_data['name']}")
        else:
            print(f"  • Wallet type already exists: {wt_data['name']}")

    db.commit()


def main():
    print("\n🌱 EMS Database Seeding")
    print("=" * 40)

    db = SessionLocal()
    try:
        print("\n📋 Seeding roles...")
        seed_roles(db)

        print("\n👤 Seeding admin user...")
        seed_admin_user(db)

        print("\n💳 Seeding wallet types...")
        seed_wallet_types(db)

        print("\n✅ Seeding complete!\n")
    except Exception as e:
        print(f"\n❌ Seeding failed: {e}\n")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
