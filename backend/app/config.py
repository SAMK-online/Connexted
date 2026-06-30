from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    api_base_url: str = "http://localhost:8000"
    frontend_origin: str = "http://localhost:5173"
    mock_providers: bool = True
    persistence_backend: str = "memory"

    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_secret: str | None = None
    database_url: str | None = None

    redis_url: str = "redis://localhost:6379/0"

    twilio_auth_token: str | None = None
    twilio_account_sid: str | None = None
    twilio_whatsapp_from: str = "whatsapp:+14155238886"

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-3-5-sonnet-latest"
    tavily_api_key: str | None = None
    google_application_credentials: str | None = Field(default=None)

    hubspot_client_id: str | None = None
    hubspot_client_secret: str | None = None
    hubspot_redirect_uri: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
