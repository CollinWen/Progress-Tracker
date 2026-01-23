"""
Configuration management for the Momentum backend.
Loads environment variables and provides typed configuration.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Google OAuth
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    google_scopes: str = "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file"

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_days: int = 7

    # API
    api_port: int = 8000
    frontend_url: str = "http://localhost:5173"

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # Environment
    environment: str = "development"
    debug: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"

    @property
    def scopes_list(self) -> List[str]:
        """Get Google OAuth scopes as a list."""
        return self.google_scopes.split()

    @property
    def origins_list(self) -> List[str]:
        """Get allowed CORS origins as a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Global settings instance
settings = Settings()
