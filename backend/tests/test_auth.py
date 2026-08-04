from fastapi.testclient import TestClient

def test_login_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_password(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "wrongpassword"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

def test_login_invalid_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "nonexistent_user", "password": "password123"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

def test_get_current_user(client: TestClient):
    # First login
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    
    # Then get current user
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "admin@test.com"
