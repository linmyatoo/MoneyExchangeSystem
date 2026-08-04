# Exchange Management System (EMS)

A production-ready web application for managing a Myanmar Money Exchange business.

## Tech Stack

| Layer      | Technology                                                     |
| ---------- | -------------------------------------------------------------- |
| Frontend   | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui     |
| Backend    | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2                 |
| Database   | PostgreSQL 15                                                  |
| Auth       | JWT + Refresh Tokens, Role-Based Access Control (Admin, Staff) |
| Deployment | Docker, Docker Compose, Nginx                                  |

## Project Structure

```
MoneyExchangeSystem/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # FastAPI routers
│   │   ├── core/             # Config, database, security
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic
│   │   ├── repositories/     # Data access layer
│   │   └── main.py           # FastAPI app entrypoint
│   ├── alembic/              # Database migrations
│   ├── scripts/              # Seed scripts
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities, API client
│   │   ├── hooks/            # Custom hooks
│   │   ├── providers/        # Context providers
│   │   └── types/            # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp .env.example .env

# 2. Start all services
docker compose up -d --build

# 3. Run database migrations
docker compose exec backend alembic upgrade head

# 4. Seed initial data
docker compose exec backend python -m scripts.seed

# 5. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Local Development (Without Docker)

### Prerequisites
- Python 3.11+
- Node.js 22+
- PostgreSQL 15+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # macOS/Linux
pip install -r requirements.txt

# Set up .env
cp .env .env.local            # Edit DATABASE_URL if needed

# Run migrations
alembic upgrade head

# Seed data
python -m scripts.seed

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Default Credentials

| Username | Password   | Role  |
| -------- | ---------- | ----- |
| admin    | admin123   | Admin |

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database

### Run Migrations

```bash
# Apply all migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "description"

# Rollback one migration
alembic downgrade -1
```

### Seed Data

```bash
python -m scripts.seed
```

Seeds: Admin role, Staff role, Admin user, and all wallet types (KPay, WavePay, AYAPay, CB Pay, KBZ Bank, AYA Bank, YOMA Bank, CB Bank, MAB Bank).
