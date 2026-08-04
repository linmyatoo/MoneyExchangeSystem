from fastapi.testclient import TestClient

def get_auth_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "password123"}
    )
    return response.json()["access_token"]

def test_create_wallet(client: TestClient):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    types_res = client.get("/api/v1/wallets/types", headers=headers)
    assert types_res.status_code == 200
    wallet_type_id = types_res.json()[0]["id"]
    
    response = client.post(
        "/api/v1/wallets/accounts",
        headers=headers,
        json={
            "account_name": "Main Cash Register",
            "account_number": "123456",
            "wallet_type_id": wallet_type_id,
            "opening_balance": 1000000,
            "is_active": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["account_name"] == "Main Cash Register"
    assert data["balance"] == "1000000.00"

def test_get_wallets(client: TestClient):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/v1/wallets/accounts", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert isinstance(data["items"], list)
