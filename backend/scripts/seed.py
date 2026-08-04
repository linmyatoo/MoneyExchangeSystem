"""
Seed script for initial data.
Run: python -m scripts.seed
"""
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext

from app.core.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.wallet_type import WalletType

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
    """Seed default Admin user."""
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        print("  ✗ Admin role not found. Run seed_roles first.")
        return

    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        admin_user = User(
            username="admin",
            email="admin@ems.local",
            hashed_password=pwd_context.hash("admin123"),
            full_name="System Administrator",
            role_id=admin_role.id,
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        print("  ✓ Created admin user (username: admin, password: admin123)")
    else:
        print("  • Admin user already exists")


def seed_wallet_types(db):
    """Seed default wallet types."""
    wallet_types_data = [
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
