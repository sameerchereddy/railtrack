"""Configuration for the API service via environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "railtrack"
    shared_path: str = "./shared"
    ipc_socket: str = "/tmp/nr_feed.sock"
    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"


settings = Settings()
