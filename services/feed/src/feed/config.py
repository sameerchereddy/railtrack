"""Feed service configuration via environment variables."""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    # Network Rail STOMP credentials
    stomp_host: str = "datafeeds.networkrail.co.uk"
    stomp_port: int = 61618
    stomp_user: str = Field(alias="NR_USER")
    stomp_pass: str = Field(alias="NR_PASS")

    # STOMP topic
    topic: str = "/topic/TRAIN_MVT_ALL_TOC"

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "railtrack"

    # Shared reference data
    shared_path: str = "./shared"

    # IPC socket path
    ipc_socket: str = "/tmp/nr_feed.sock"

    # Train state settings
    train_max_age_h: int = 6
    max_journey: int = 150

    # Logging
    log_level: str = "INFO"

settings = Settings()
