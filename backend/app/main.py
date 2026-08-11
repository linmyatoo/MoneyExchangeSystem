from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
import traceback
from app.api.v1 import auth, health, roles, users, wallets, customers, wallet_transactions, currency_exchange, exchange_rates, reports, dashboard, cash_management, audit_logs

app = FastAPI(title="Exchange Management System API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost", "http://127.0.0.1"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(roles.router, prefix="/api/v1/roles", tags=["roles"])
app.include_router(wallets.router, prefix="/api/v1/wallets", tags=["wallets"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(wallet_transactions.router, prefix="/api/v1/wallet-transactions", tags=["wallet-transactions"])
app.include_router(currency_exchange.router, prefix="/api/v1/currency-exchange", tags=["currency-exchange"])
app.include_router(exchange_rates.router, prefix="/api/v1/exchange-rates", tags=["exchange-rates"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(cash_management.router, prefix="/api/v1/cash-management", tags=["cash-management"])
app.include_router(audit_logs.router, prefix="/api/v1/audit-logs", tags=["audit-logs"])

@app.get("/")
async def root():
    return {"message": "Welcome to EMS API"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled exception: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred. Please contact support."},
    )
