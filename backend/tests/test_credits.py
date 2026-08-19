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


def test_manual_credit_flow(client: TestClient):
    h = auth(client)
    w = make_wallet(client, h, 1000)

    # create manual credit: no wallet touched
    r = client.post("/api/v1/wallet-transactions", headers=h, json={
        "transaction_type": "credit", "customer_name": "John", "amount": 500, "is_credit": True,
    })
    assert r.status_code == 200, r.text
    tx = r.json()
    assert tx["transaction_type"] == "credit"
    assert tx["is_credit"] is True
    assert tx["notes"] == "Customer: John"
    bal = client.get("/api/v1/wallets/accounts", headers=h).json()["items"][0]["balance"]
    assert float(bal) == 1000.0, bal

    # repaying settles the record without moving money
    r = client.put(f"/api/v1/wallet-transactions/{tx['id']}", headers=h, json={
        "transaction_type": "credit", "amount": 500, "is_credit": False, "notes": tx["notes"],
    })
    assert r.status_code == 200, r.text
    settled = r.json()
    assert settled["is_credit"] is False
    assert settled["notes"] == "Customer: John"
    assert settled["to_wallet_account_id"] is None
    assert settled["from_wallet_account_id"] is None
    bal = client.get("/api/v1/wallets/accounts", headers=h).json()["items"][0]["balance"]
    assert float(bal) == 1000.0, bal

    # a wallet sent along with the repayment is ignored, not credited
    r = client.put(f"/api/v1/wallet-transactions/{tx['id']}", headers=h, json={
        "transaction_type": "credit", "amount": 500, "is_credit": False,
        "to_wallet_account_id": w["id"], "notes": tx["notes"],
    })
    assert r.status_code == 200, r.text
    bal = client.get("/api/v1/wallets/accounts", headers=h).json()["items"][0]["balance"]
    assert float(bal) == 1000.0, bal

    # deleting it leaves balances untouched too
    r = client.delete(f"/api/v1/wallet-transactions/{tx['id']}", headers=h)
    assert r.status_code == 200, r.text
    bal = client.get("/api/v1/wallets/accounts", headers=h).json()["items"][0]["balance"]
    assert float(bal) == 1000.0, bal


def test_manual_credit_rejects_wallet(client: TestClient):
    h = auth(client)
    w = make_wallet(client, h)
    r = client.post("/api/v1/wallet-transactions", headers=h, json={
        "transaction_type": "credit", "customer_name": "John", "amount": 500,
        "is_credit": True, "from_wallet_account_id": w["id"],
    })
    assert r.status_code == 400, r.text


def test_transaction_credit_settle_does_not_move_money(client: TestClient):
    h = auth(client)
    w = make_wallet(client, h, 1000)
    # deposit-style credit from the transactions page: money already moved at creation
    r = client.post("/api/v1/wallet-transactions", headers=h, json={
        "transaction_type": "deposit", "from_wallet_account_id": w["id"],
        "amount": 200, "is_credit": True,
    })
    assert r.status_code == 200, r.text
    tx = r.json()
    assert float(client.get("/api/v1/wallets/accounts", headers=h).json()["items"][0]["balance"]) == 800.0

    r = client.put(f"/api/v1/wallet-transactions/{tx['id']}", headers=h, json={
        "transaction_type": "deposit", "from_wallet_account_id": w["id"],
        "amount": 200, "is_credit": False,
    })
    assert r.status_code == 200, r.text
    assert float(client.get("/api/v1/wallets/accounts", headers=h).json()["items"][0]["balance"]) == 800.0
