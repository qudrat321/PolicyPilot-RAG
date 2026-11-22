"""Embeddings service using Google GenAI API (768 dimensions)."""
from typing import List, Optional
from google import genai
from google.genai import types
from app.config import settings

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


def embed_text(text: str) -> List[float]:
    """Generate a single 768-dimensional embedding vector for a query or passage."""
    client = get_genai_client()
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config={"output_dimensionality": VECTOR_DIMENSION},
    )
    return response.embeddings[0].values


def embed_batch(texts: List[str], batch_size: int = 20) -> List[List[float]]:
    """Embed multiple texts in small batches to respect rate limits and reduce HTTP calls."""
    if not texts:
        return []

    client = get_genai_client()
    all_vectors = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
            config={"output_dimensionality": VECTOR_DIMENSION},
        )
        for emb in response.embeddings:
            all_vectors.append(emb.values)

    return all_vectors
