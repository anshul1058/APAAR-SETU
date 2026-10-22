"""Application settings loaded from environment / .env (backend_guide.md §2)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 60
    apaar_regex: str = r"^\d{12}$"
    apaar_mode: str = "mock"
    signing_private_key: str = ""
    llm_url: str = "http://localhost:11434/v1"
    llm_key: str = "ollama"
    llm_model: str = "llama3.1:8b"
    fuzzy_threshold: int = 90
    anomaly_threshold: float = 0.65
    cors_origins: str = "http://localhost:5173"


settings = Settings()
