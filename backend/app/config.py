"""Application settings loaded from environment / .env (backend_guide.md §2)."""
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Make cloud Postgres URLs usable by SQLAlchemy (Render / Supabase / Neon).

    * Render hands out ``postgres://...`` — SQLAlchemy 2.x only loads the
      ``postgresql`` dialect, so the scheme is rewritten automatically.
      Without this, the app dies at import with
      ``NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:postgres``.
    * Managed Postgres requires SSL: append ``sslmode=require`` when the host
      is not localhost and the URL doesn't already pin an sslmode.
    Local URLs (localhost / 127.0.0.1 / ::1) are left untouched.
    """
    # The project installs psycopg2-binary, not psycopg (v3). SQLAlchemy 2
    # defaults a bare postgresql:// URL to psycopg, which crashes at import
    # time with "ModuleNotFoundError: No module named 'psycopg'". Normalize
    # both Render's postgres:// URL and ordinary postgresql:// URLs to the
    # driver that is present in requirements.txt.
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    parsed = urlparse(url)
    if parsed.hostname and parsed.hostname not in ("localhost", "127.0.0.1", "::1"):
        query = dict(parse_qsl(parsed.query))
        query.setdefault("sslmode", "require")
        url = urlunparse(parsed._replace(query=urlencode(query)))
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 60
    apaar_regex: str = r"^\d{12}$"

    @field_validator("apaar_regex")
    @classmethod
    def normalize_apaar_regex(cls, value: str) -> str:
        """Accept APAAR regex values over-escaped by deployment env editors."""
        return value.replace("\\\\d", "\\d")
    apaar_mode: str = "mock"
    signing_private_key: str = ""
    llm_url: str = "http://localhost:11434/v1"
    llm_key: str = "ollama"
    llm_model: str = "llama3.1:8b"
    fuzzy_threshold: int = 90
    anomaly_threshold: float = 0.65
    cors_origins: str = "http://localhost:5173"
    # optional: Supabase project info (used by docs/tooling, not the app itself)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    llm_reader_password: str = ""

    @field_validator("database_url")
    @classmethod
    def _fix_provider_url(cls, v: str) -> str:
        return normalize_database_url(v)


settings = Settings()
