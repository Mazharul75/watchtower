"""
Centralized settings, loaded from environment variables (.env in local dev).
Mirrors apps/web's .env in the one field that must match exactly: DATABASE_URL
— both services read from the same Postgres database (see docs/ADR-001).
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:55432/watchtower"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"
    sentry_dsn: str | None = None

    # Rate limiting (slowapi / limits library syntax, e.g. "60/minute")
    default_rate_limit: str = "120/minute"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
