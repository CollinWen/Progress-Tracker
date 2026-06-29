"""
Configuration for Momentum API v2 (Firebase-based)
"""
import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings."""

    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"

    # API Configuration
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))

    # CORS
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

    @property
    def origins_list(self) -> List[str]:
        """Parse allowed origins into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    # Firebase Configuration
    firebase_project_id: str = os.getenv("FIREBASE_PROJECT_ID", "")
    firebase_database_name: str = os.getenv("FIREBASE_DATABASE_NAME", "(default)")
    firebase_credentials_path: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

    # JWT Configuration (for custom tokens if needed)
    jwt_secret: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_expiration_days: int = 7

    # Agent orchestrator (MCP) authentication.
    # The local orchestrator authenticates to the mounted /mcp endpoint with a static
    # bearer token; on success it operates as a single configured user. See mcp_server/.
    orchestrator_token: str = os.getenv("ORCHESTRATOR_TOKEN", "")
    orchestrator_user_id: str = os.getenv("ORCHESTRATOR_USER_ID", "")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
