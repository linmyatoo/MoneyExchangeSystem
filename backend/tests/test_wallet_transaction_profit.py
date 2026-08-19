from fastapi.testclient import TestClient


def auth(client: TestClient):
    r = client.post("/api/v1/auth/login", data={"username": "admin_test", "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def make_wallet(client, headers, balance=1000):
    wt = client.get("/api/v1/wallets/types", headers=headers).json()[0]["id"]
    r = client.post("/api/v1/wallets/accounts", headers=headers, json={
        "account_name": "Cash", "account_number": None, "wallet_type_id": wt,
        "opening_balance": balance, "is_active": True,
    })
    return r.json()


def test_delete_restores_amount_and_profit(client: TestClient):
    h = auth(client)
    wt = client.get("/api/v1/wallets/types", headers=h).json()[0]["id"]
    src = client.post("/api/v1/wallets/accounts", headers=h, json={
        "account_name": "Source", "account_number": None, "wallet_type_id": wt,
        "opening_balance": 1000, "is_active": True,
    }).json()
    profit_w = client.post("/api/v1/wallets/accounts", headers=h, json={
        "account_name": "Profit Store", "account_number": None, "wallet_type_id": wt,
        "opening_balance": 0, "is_active": True,
    }).json()

    def balance(wallet_id):
        items = client.get("/api/v1/wallets/accounts", headers=h).json()["items"]
        return float(next(w for w in items if w["id"] == wallet_id)["balance"])

    r = client.post("/api/v1/wallet-transactions", headers=h, json={
        "transaction_type": "deposit", "from_wallet_account_id": src["id"],
        "amount": 300, "profit": 50, "profit_wallet_account_id": profit_w["id"],
    })
    assert r.status_code == 200, r.text
    tx = r.json()
    assert tx["profit_wallet_account_id"] == profit_w["id"]
    assert balance(src["id"]) == 700.0
    assert balance(profit_w["id"]) == 50.0

    r = client.delete(f"/api/v1/wallet-transactions/{tx['id']}", headers=h)
    assert r.status_code == 200, r.text
    assert balance(src["id"]) == 1000.0
    assert balance(profit_w["id"]) == 0.0


def test_edit_moves_profit_between_wallets(client: TestClient):
    h = auth(client)
    wt = client.get("/api/v1/wallets/types", headers=h).json()[0]["id"]
    src = client.post("/api/v1/wallets/accounts", headers=h, json={
        "account_name": "Source", "account_number": None, "wallet_type_id": wt,
        "opening_balance": 1000, "is_active": True,
    }).json()
    p1 = client.post("/api/v1/wallets/accounts", headers=h, json={
        "account_name": "Profit A", "account_number": None, "wallet_type_id": wt,
        "opening_balance": 0, "is_active": True,
    }).json()
    p2 = client.post("/api/v1/wallets/accounts", headers=h, json={
        "account_name": "Profit B", "account_number": None, "wallet_type_id": wt,
        "opening_balance": 0, "is_active": True,
    }).json()

    def balance(wallet_id):
        items = client.get("/api/v1/wallets/accounts", headers=h).json()["items"]
        return float(next(w for w in items if w["id"] == wallet_id)["balance"])

    tx = client.post("/api/v1/wallet-transactions", headers=h, json={
        "transaction_type": "deposit", "from_wallet_account_id": src["id"],
        "amount": 300, "profit": 50, "profit_wallet_account_id": p1["id"],
    }).json()
    assert balance(p1["id"]) == 50.0

    r = client.put(f"/api/v1/wallet-transactions/{tx['id']}", headers=h, json={
        "transaction_type": "deposit", "from_wallet_account_id": src["id"],
        "amount": 300, "profit": 80, "profit_wallet_account_id": p2["id"],
    })
    assert r.status_code == 200, r.text
    assert balance(p1["id"]) == 0.0
    assert balance(p2["id"]) == 80.0
    assert balance(src["id"]) == 700.0


def test_settling_credit_keeps_profit_wallet(client: TestClient):
    h = auth(client)
    wt = client.get("/api/v1/wallets/types", headers=h).json()[0]["id"]
    src = client.post("/api/v1/wallets/accounts", headers=h, json={
        "account_name": "Source", "account_number": None, "wallet_type_id": wt,
        "opening_balance": 1000, "is_active": True,
    }).json()
    pw = client.post("/api/v1/wallets/accounts", headers=h, json={
        "account_name": "Profit Store", "account_number": None, "wallet_type_id": wt,
        "opening_balance": 0, "is_active": True,
    }).json()

    tx = client.post("/api/v1/wallet-transactions", headers=h, json={
        "transaction_type": "deposit", "from_wallet_account_id": src["id"],
        "amount": 300, "profit": 50, "profit_wallet_account_id": pw["id"],
        "is_credit": True,
    }).json()

    # The credits page settles without sending a profit wallet; it must be kept.
    r = client.put(f"/api/v1/wallet-transactions/{tx['id']}", headers=h, json={
        "transaction_type": "deposit", "from_wallet_account_id": src["id"],
        "amount": 300, "profit": 50, "is_credit": False,
    })
    assert r.status_code == 200, r.text
    assert r.json()["profit_wallet_account_id"] == pw["id"]

    client.delete(f"/api/v1/wallet-transactions/{tx['id']}", headers=h)
    items = client.get("/api/v1/wallets/accounts", headers=h).json()["items"]
    balances = {w["id"]: float(w["balance"]) for w in items}
    assert balances[pw["id"]] == 0.0
    assert balances[src["id"]] == 1000.0
