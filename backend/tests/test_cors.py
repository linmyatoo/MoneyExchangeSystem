"""CORS headers must survive every response, including failures.

A 500 that comes back without Access-Control-Allow-Origin is reported by the
browser as a CORS error, which hides the actual server error from anyone
debugging the deployed frontend.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.currency_exchange_service import CurrencyExchangeService

ORIGIN = "http://localhost:3000"


def get_auth_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "password123"}
    )
    return response.json()["access_token"]


def test_cors_headers_present_on_unhandled_error(client: TestClient, monkeypatch):
    token = get_auth_token(client)

    def boom(*args, **kwargs):
        raise RuntimeError("simulated failure inside the endpoint")

    monkeypatch.setattr(CurrencyExchangeService, "buy_thb", boom)

    response = client.post(
        "/api/v1/currency-exchange/buy",
        headers={"Authorization": f"Bearer {token}", "Origin": ORIGIN},
        json={
            "mmk_wallet_id": "00000000-0000-0000-0000-000000000001",
            "thb_wallet_id": "00000000-0000-0000-0000-000000000002",
            "foreign_amount": 100,
            "rate_used": 1250,
        },
    )

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == ORIGIN


@pytest.mark.parametrize(
    "path,expected_status",
    [
        ("/api/v1/currency-exchange/buy", 401),  # no token
        ("/api/v1/currency-exchange/does-not-exist", 404),
    ],
)
def test_cors_headers_present_on_error_responses(client: TestClient, path, expected_status):
    response = client.post(path, headers={"Origin": ORIGIN}, json={})

    assert response.status_code == expected_status
    assert response.headers["access-control-allow-origin"] == ORIGIN
