"""User management guards against locking every admin out of the system."""
import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserUpdate
from app.services.user_service import UserService


def get_auth_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "password123"}
    )
    return response.json()["access_token"]


def auth_headers(client: TestClient) -> dict:
    return {"Authorization": f"Bearer {get_auth_token(client)}"}


def get_me(client: TestClient, headers: dict) -> dict:
    return client.get("/api/v1/auth/me", headers=headers).json()


def create_staff_user(client: TestClient, headers: dict) -> dict:
    roles = client.get("/api/v1/roles", headers=headers).json()
    staff_role = next(role for role in roles if role["name"] == "staff")

    response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "username": "staff_test",
            "email": "staff@test.com",
            "password": "password123",
            "full_name": "Staff Test",
            "role_id": staff_role["id"],
        },
    )
    assert response.status_code == 201
    return response.json()


def seed_admin(db: Session, username: str, is_active: bool = True) -> User:
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    user = User(
        username=username,
        email=f"{username}@test.com",
        full_name=username,
        hashed_password=get_password_hash("password123"),
        role_id=admin_role.id,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def only_admin(db: Session) -> User:
    return db.query(User).filter(User.username == "admin_test").first()


# --- Self-lockout guards (the reachable case over HTTP) -----------------------

def test_cannot_delete_own_account(client: TestClient):
    headers = auth_headers(client)
    me = get_me(client, headers)

    response = client.delete(f"/api/v1/users/{me['id']}", headers=headers)

    assert response.status_code == 400
    assert "your own account" in response.json()["detail"]


def test_cannot_deactivate_own_account(client: TestClient):
    headers = auth_headers(client)
    me = get_me(client, headers)

    response = client.post(f"/api/v1/users/{me['id']}/deactivate", headers=headers)

    assert response.status_code == 400
    assert "your own account" in response.json()["detail"]


def test_cannot_deactivate_own_account_via_update(client: TestClient):
    headers = auth_headers(client)
    me = get_me(client, headers)

    response = client.put(
        f"/api/v1/users/{me['id']}", headers=headers, json={"is_active": False}
    )

    assert response.status_code == 400
    assert "your own account" in response.json()["detail"]


def test_admin_can_still_sign_in_after_a_blocked_deactivate(client: TestClient):
    """Regression: a blocked deactivate must not half-apply and lock the admin out."""
    headers = auth_headers(client)
    me = get_me(client, headers)

    client.post(f"/api/v1/users/{me['id']}/deactivate", headers=headers)

    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    login = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "password123"},
    )
    assert login.status_code == 200


# --- The guards must not over-block ------------------------------------------

def test_can_deactivate_another_user(client: TestClient):
    headers = auth_headers(client)
    staff = create_staff_user(client, headers)

    response = client.post(f"/api/v1/users/{staff['id']}/deactivate", headers=headers)

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_can_delete_another_user(client: TestClient):
    headers = auth_headers(client)
    staff = create_staff_user(client, headers)

    response = client.delete(f"/api/v1/users/{staff['id']}", headers=headers)

    assert response.status_code == 200

    listed = client.get("/api/v1/users", headers=headers).json()
    assert staff["id"] not in [user["id"] for user in listed["items"]]


def test_last_staff_user_is_not_protected(client: TestClient):
    """Only admins hold the system open — staff accounts are freely removable."""
    headers = auth_headers(client)
    staff = create_staff_user(client, headers)

    response = client.delete(f"/api/v1/users/{staff['id']}", headers=headers)

    assert response.status_code == 200


# --- Last-active-admin guard (service level; unreachable over HTTP by design) --

def test_cannot_delete_last_active_admin(db: Session):
    service = UserService(db)
    admin = only_admin(db)

    with pytest.raises(HTTPException) as exc:
        service.delete_user(admin.id, acting_user_id=uuid.uuid4())

    assert exc.value.status_code == 400
    assert "last active admin" in exc.value.detail
    db.refresh(admin)
    assert not admin.is_deleted


def test_cannot_deactivate_last_active_admin(db: Session):
    service = UserService(db)
    admin = only_admin(db)

    with pytest.raises(HTTPException) as exc:
        service.deactivate_user(admin.id, acting_user_id=uuid.uuid4())

    assert exc.value.status_code == 400
    assert "last active admin" in exc.value.detail
    db.refresh(admin)
    assert admin.is_active


def test_cannot_deactivate_last_active_admin_via_update(db: Session):
    service = UserService(db)
    admin = only_admin(db)

    with pytest.raises(HTTPException) as exc:
        service.update_user(
            admin.id, UserUpdate(is_active=False), acting_user_id=uuid.uuid4()
        )

    assert exc.value.status_code == 400
    assert "last active admin" in exc.value.detail
    db.refresh(admin)
    assert admin.is_active


def test_can_delete_an_admin_when_another_admin_is_active(db: Session):
    other_admin = seed_admin(db, "admin_two")
    service = UserService(db)
    admin = only_admin(db)

    deleted = service.delete_user(admin.id, acting_user_id=other_admin.id)

    assert deleted.is_deleted


def test_inactive_admins_do_not_count_towards_the_guard(db: Session):
    other_admin = seed_admin(db, "admin_two", is_active=False)
    service = UserService(db)
    admin = only_admin(db)

    with pytest.raises(HTTPException) as exc:
        service.delete_user(admin.id, acting_user_id=other_admin.id)

    assert "last active admin" in exc.value.detail


def test_soft_deleted_admins_do_not_count_towards_the_guard(db: Session):
    other_admin = seed_admin(db, "admin_two")
    service = UserService(db)
    service.delete_user(other_admin.id, acting_user_id=only_admin(db).id)
    admin = only_admin(db)

    with pytest.raises(HTTPException) as exc:
        service.delete_user(admin.id, acting_user_id=uuid.uuid4())

    assert "last active admin" in exc.value.detail


def test_an_already_inactive_admin_can_be_deleted(db: Session):
    """An admin who cannot sign in is not holding the system open."""
    service = UserService(db)
    admin = only_admin(db)
    admin.is_active = False
    db.commit()

    deleted = service.delete_user(admin.id, acting_user_id=uuid.uuid4())

    assert deleted.is_deleted


def test_staff_users_are_not_protected_by_the_admin_guard(db: Session):
    staff_role = db.query(Role).filter(Role.name == "staff").first()
    staff = User(
        username="staff_only",
        full_name="Staff Only",
        hashed_password=get_password_hash("password123"),
        role_id=staff_role.id,
        is_active=True,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    service = UserService(db)

    deleted = service.delete_user(staff.id, acting_user_id=uuid.uuid4())

    assert deleted.is_deleted
