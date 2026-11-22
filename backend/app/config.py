"""Application configuration and environment settings."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Holds configuration values loaded from environment variables or .env file."""

    # Google AI Studio API Key (for Gemini Flash and text-embedding-004)
    gemini_api_key: str = ""

    # Qdrant Cloud Free Cluster settings
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "policy_documents"

    # Application limits and thresholds
    environment: str = "development"
    log_level: str = "INFO"
    max_upload_size_mb: int = 5
    max_table_rows: int = 300
    max_table_sheets: int = 10
    similarity_threshold: float = 0.58
    top_k_chunks: int = 4
    max_total_vectors: int = 1500  # Soft quota guard for Qdrant Cloud Free Tier

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
