"""Application configuration and environment settings."""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent


class Settings(BaseSettings):
    """Holds configuration values loaded from environment variables or .env file."""

    # Google AI Studio API Key (for embeddings & optional Gemini generation)
    gemini_api_key: str = ""

    # Groq API Key and Provider selection
    groq_api_key: str = ""
    llm_provider: str = "groq"  # "groq" or "gemini"

    # Primary and fallback LLM models for resilient failover
    llm_model: str = "openai/gpt-oss-120b"
    llm_fallback_model: str = "openai/gpt-oss-20b"

    # Qdrant Cloud Free Cluster settings
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "policy_documents"

    # Supabase PostgreSQL & Auth settings (optional for multi-user mode)
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_jwt_secret: str = ""

    # Application limits and thresholds
    environment: str = "development"
    cors_origins: str = "*"  # Comma-separated domains e.g. "https://policypilot.vercel.app,http://localhost:3000" or "*"
    log_level: str = "INFO"
    max_upload_size_mb: int = 5
    max_table_rows: int = 300
    max_table_sheets: int = 10
    similarity_threshold: float = 0.58
    top_k_chunks: int = 4
    max_total_vectors: int = 1500  # Soft quota guard for Qdrant Cloud Free Tier

    class Config:
        env_file = (
            str(BASE_DIR / ".env"),
            str(ROOT_DIR / ".env"),
            ".env",
        )
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
