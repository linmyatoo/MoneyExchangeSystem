from fastapi.testclient import TestClient

def get_auth_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "password123"}
    )
    return response.json()["access_token"]

def test_prevent_negative_balance(client: TestClient):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    types_res = client.get("/api/v1/wallets/types", headers=headers)
    assert types_res.status_code == 200
    wallet_type_id = types_res.json()[0]["id"]
    
    # Create source wallet with 10,000 balance
    res1 = client.post(
        "/api/v1/wallets/accounts",
        headers=headers,
        json={
            "account_name": "Source Wallet",
            "wallet_type_id": wallet_type_id,
            "opening_balance": 10000,
            "is_active": True
        }
    )
    assert res1.status_code == 200
    source_wallet = res1.json()
    
    # Create dest wallet
    res2 = client.post(
        "/api/v1/wallets/accounts",
        headers=headers,
        json={
            "account_name": "Dest Wallet",
            "wallet_type_id": wallet_type_id,
            "opening_balance": 0,
            "is_active": True
        }
    )
    assert res2.status_code == 200
    dest_wallet = res2.json()
    
    # Attempt to transfer 20,000 (more than balance)
    res_transfer = client.post(
        "/api/v1/wallet-transactions",
        headers=headers,
        json={
            "from_wallet_account_id": source_wallet["id"],
            "to_wallet_account_id": dest_wallet["id"],
            "amount": 20000,
            "profit": 0,
            "notes": "Test negative balance"
        }
    )
    assert res_transfer.status_code == 400
    assert "Insufficient balance" in res_transfer.json()["detail"]
