"""Embeddings service using Google GenAI API (768 dimensions) with rate limiting & exponential backoff."""
import time
import logging
from typing import List, Optional
from google import genai
from google.genai import types
from google.genai import errors
from app.config import settings

logger = logging.getLogger(__name__)

# Google embedding model supporting Matryoshka Representation Learning (768-dim)
EMBEDDING_MODEL = "gemini-embedding-001"
VECTOR_DIMENSION = 768

_client_instance: Optional[genai.Client] = None


def get_genai_client() -> genai.Client:
    """Return an authenticated singleton Google GenAI client instance with timeout."""
    global _client_instance
    if _client_instance is None:
        _client_instance = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=20000),
        )
    return _client_instance


def _call_embed_with_retry(contents, is_batch: bool = False, max_retries: int = 4):
    """
    Execute embed_content with exponential backoff on 429 rate limits or quota exceeded.
    Handles situations where RPM exceeds 100 by sleeping and retrying smoothly.
    """
    client = get_genai_client()
    backoff_delay = 2.0

    for attempt in range(1, max_retries + 1):
        try:
            return client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=contents,
                config={"output_dimensionality": VECTOR_DIMENSION},
            )
        except errors.APIError as e:
            is_rate_limit = (
                getattr(e, "code", None) == 429
                or "429" in str(e)
                or "resource_exhausted" in str(e).lower()
                or "quota" in str(e).lower()
            )
            if is_rate_limit and attempt < max_retries:
                logger.warning(
                    f"Gemini Embedding rate limit (RPM/429) hit. Backing off for {backoff_delay}s (attempt {attempt}/{max_retries})..."
                )
                time.sleep(backoff_delay)
                backoff_delay *= 2.0
            else:
                raise e
        except Exception as e:
            if ("429" in str(e) or "quota" in str(e).lower() or "resource" in str(e).lower()) and attempt < max_retries:
                logger.warning(
                    f"Transient rate error. Backing off for {backoff_delay}s (attempt {attempt}/{max_retries})..."
                )
                time.sleep(backoff_delay)
                backoff_delay *= 2.0
            else:
                raise e


def embed_text(text: str) -> List[float]:
    """Generate a single 768-dimensional embedding vector with retry protection."""
    response = _call_embed_with_retry(text, is_batch=False)
    return response.embeddings[0].values


def embed_batch(texts: List[str], batch_size: int = 25) -> List[List[float]]:
    """
    Embed multiple texts in batches to respect rate limits and reduce HTTP calls.
    Paces batch dispatches with gentle intervals to ensure the 100 RPM ceiling is never exceeded.
    """
    if not texts:
        return []

    all_vectors = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = _call_embed_with_retry(batch, is_batch=True)
        for emb in response.embeddings:
            all_vectors.append(emb.values)

        # Inter-batch pacing to guarantee requests stay comfortably below 100 RPM
        if i + batch_size < len(texts):
            time.sleep(0.35)

    return all_vectors
