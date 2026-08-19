from fastapi.testclient import TestClient


def auth(client: TestClient):
    r = client.post("/api/v1/auth/login", data={"username": "admin_test", "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def make_wallet(client, headers, name, balance):
    wt = client.get("/api/v1/wallets/types", headers=headers).json()[0]["id"]
    return client.post("/api/v1/wallets/accounts", headers=headers, json={
        "account_name": name, "account_number": None, "wallet_type_id": wt,
        "opening_balance": balance, "is_active": True,
    }).json()


def balance(client, headers, wallet_id):
    items = client.get("/api/v1/wallets/accounts", headers=headers).json()["items"]
    return float(next(w for w in items if w["id"] == wallet_id)["balance"])


def test_buy_derives_rate_from_amounts(client: TestClient):
    h = auth(client)
    mmk = make_wallet(client, h, "MMK Cash", 1000000)
    thb = make_wallet(client, h, "THB Bank", 0)

    r = client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    })
    assert r.status_code == 200, r.text
    tx = r.json()
    # 100,000 MMK buys 2,000 THB at these amounts
    assert float(tx["rate_used"]) == 2000.0
    assert float(tx["local_amount"]) == 50000.0
    assert balance(client, h, mmk["id"]) == 950000.0
    assert balance(client, h, thb["id"]) == 1000.0


def test_buy_rejects_insufficient_mmk(client: TestClient):
    h = auth(client)
    mmk = make_wallet(client, h, "MMK Cash", 10000)
    thb = make_wallet(client, h, "THB Bank", 0)

    r = client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    })
    assert r.status_code == 400, r.text


def test_sell_profit_against_average_buy(client: TestClient):
    h = auth(client)
    mmk = make_wallet(client, h, "MMK Cash", 1000000)
    thb = make_wallet(client, h, "THB Bank", 0)

    client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    })

    # Selling 500 THB for 26,000 MMK; it cost 25,000 MMK at the average buy rate.
    r = client.post("/api/v1/currency-exchange/sell", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 500, "local_amount": 26000,
    })
    assert r.status_code == 200, r.text
    tx = r.json()
    assert float(tx["profit"]) == 1000.0
    assert float(tx["rate_used"]) == round(100000 * 500 / 26000, 4)
    assert balance(client, h, thb["id"]) == 500.0
    assert balance(client, h, mmk["id"]) == 976000.0


def test_inventory_totals_follow_period(client: TestClient):
    h = auth(client)
    mmk = make_wallet(client, h, "MMK Cash", 1000000)
    thb = make_wallet(client, h, "THB Bank", 0)

    client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    })
    client.post("/api/v1/currency-exchange/sell", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 500, "local_amount": 26000,
    })

    for period in ("today", "this_month", ""):
        r = client.get("/api/v1/currency-exchange/inventory", headers=h, params={"period": period})
        assert r.status_code == 200, r.text
        s = r.json()
        assert float(s["buy_thb"]) == 1000.0, period
        assert float(s["buy_mmk"]) == 50000.0, period
        assert float(s["sell_thb"]) == 500.0, period
        assert float(s["sell_mmk"]) == 26000.0, period
        assert float(s["profit"]) == 1000.0, period

    # Nothing was traded yesterday
    r = client.get("/api/v1/currency-exchange/inventory", headers=h, params={"period": "yesterday"})
    s = r.json()
    assert float(s["buy_thb"]) == 0.0
    assert float(s["sell_mmk"]) == 0.0


def test_edit_buy_restores_then_reapplies(client: TestClient):
    h = auth(client)
    mmk = make_wallet(client, h, "MMK Cash", 1000000)
    thb = make_wallet(client, h, "THB Bank", 0)

    tx = client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    }).json()

    r = client.put(f"/api/v1/currency-exchange/buy/{tx['id']}", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 600, "local_amount": 30000,
    })
    assert r.status_code == 200, r.text
    updated = r.json()
    assert float(updated["foreign_amount"]) == 600.0
    assert float(updated["rate_used"]) == 2000.0
    # Only the corrected amounts remain applied, not both versions
    assert balance(client, h, mmk["id"]) == 970000.0
    assert balance(client, h, thb["id"]) == 600.0


def test_edit_buy_can_move_to_other_wallets(client: TestClient):
    h = auth(client)
    mmk_a = make_wallet(client, h, "MMK A", 1000000)
    mmk_b = make_wallet(client, h, "MMK B", 1000000)
    thb = make_wallet(client, h, "THB Bank", 0)

    tx = client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk_a["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    }).json()

    r = client.put(f"/api/v1/currency-exchange/buy/{tx['id']}", headers=h, json={
        "mmk_wallet_id": mmk_b["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    })
    assert r.status_code == 200, r.text
    assert balance(client, h, mmk_a["id"]) == 1000000.0
    assert balance(client, h, mmk_b["id"]) == 950000.0
    assert balance(client, h, thb["id"]) == 1000.0


def test_delete_buy_restores_wallets_and_hides_row(client: TestClient):
    h = auth(client)
    mmk = make_wallet(client, h, "MMK Cash", 1000000)
    thb = make_wallet(client, h, "THB Bank", 0)

    tx = client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    }).json()

    r = client.delete(f"/api/v1/currency-exchange/buy/{tx['id']}", headers=h)
    assert r.status_code == 200, r.text
    assert balance(client, h, mmk["id"]) == 1000000.0
    assert balance(client, h, thb["id"]) == 0.0

    history = client.get("/api/v1/currency-exchange/history", headers=h).json()
    assert all(item["id"] != tx["id"] for item in history["items"])

    summary = client.get("/api/v1/currency-exchange/inventory", headers=h).json()
    assert float(summary["buy_thb"]) == 0.0

    # It is gone for good
    assert client.delete(f"/api/v1/currency-exchange/buy/{tx['id']}", headers=h).status_code == 404


def test_delete_sell_restores_wallets(client: TestClient):
    h = auth(client)
    mmk = make_wallet(client, h, "MMK Cash", 1000000)
    thb = make_wallet(client, h, "THB Bank", 0)

    client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    })
    sell = client.post("/api/v1/currency-exchange/sell", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 500, "local_amount": 26000,
    }).json()

    r = client.delete(f"/api/v1/currency-exchange/sell/{sell['id']}", headers=h)
    assert r.status_code == 200, r.text
    assert balance(client, h, thb["id"]) == 1000.0
    assert balance(client, h, mmk["id"]) == 950000.0


def test_delete_buy_blocked_when_thb_already_spent(client: TestClient):
    h = auth(client)
    mmk = make_wallet(client, h, "MMK Cash", 1000000)
    thb = make_wallet(client, h, "THB Bank", 0)

    buy = client.post("/api/v1/currency-exchange/buy", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 1000, "local_amount": 50000,
    }).json()
    client.post("/api/v1/currency-exchange/sell", headers=h, json={
        "mmk_wallet_id": mmk["id"], "thb_wallet_id": thb["id"],
        "foreign_amount": 800, "local_amount": 42000,
    })

    r = client.delete(f"/api/v1/currency-exchange/buy/{buy['id']}", headers=h)
    assert r.status_code == 400, r.text
    # Nothing moved: the buy is still in place
    assert balance(client, h, thb["id"]) == 200.0
    assert balance(client, h, mmk["id"]) == 992000.0
