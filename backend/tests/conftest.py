import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.base import Base
from app.api.deps import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.role import Role
from app.models.wallet_type import WalletType

from sqlalchemy.pool import StaticPool

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def db() -> Generator:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    
    # Seed basic roles and admin user
    admin_role = Role(name="admin", description="Admin role")
    staff_role = Role(name="staff", description="Staff role")
    db_session.add(admin_role)
    db_session.add(staff_role)
    db_session.commit()
    db_session.refresh(admin_role)
    
    admin_user = User(
        email="admin@test.com",
        username="admin_test",
        full_name="Admin Test",
        hashed_password=get_password_hash("password123"),
        role_id=admin_role.id,
        is_active=True
    )
    db_session.add(admin_user)
    
    # Seed wallet type
    wallet_type = WalletType(name="Cash", code="CASH")
    db_session.add(wallet_type)
    
    db_session.commit()
    
    yield db_session
    db_session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def client(db) -> Generator:
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
