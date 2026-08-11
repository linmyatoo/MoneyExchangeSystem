from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Exchange Management System"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    # Defaults to off: DEBUG drives SQLAlchemy echo, which logs every statement
    # and its parameters (customer names, amounts). Opt in explicitly in dev.
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ems_db"

    # JWT
    SECRET_KEY: str = "your_super_secret_key_here_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Initial admin account created by scripts/seed.py. The password has no
    # production default on purpose — seeding refuses to run without one.
    SEED_ADMIN_USERNAME: str = "admin"
    SEED_ADMIN_EMAIL: str = "admin@ems.local"
    SEED_ADMIN_PASSWORD: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
