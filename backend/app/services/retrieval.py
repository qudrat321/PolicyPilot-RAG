"""Retrieval service querying Qdrant Cloud with optional document scoping."""
from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.embeddings import embed_text
from app.services.vector_store import search_similar_chunks
from app.services.generation import formulate_search_query_in_english


def retrieve_context(
    question: str,
    top_k: int = None,
    filter_doc_id: Optional[str] = None,
    filter_file_hash: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Step 1 (Retrieve): Embed the user question and retrieve top-k matching policy chunks from Qdrant.
    If the question is in Urdu, Roman Urdu, Pashto, or non-English, formulates an internal
    English search query to match against English document embeddings.
    """
    k = top_k if top_k is not None else settings.top_k_chunks
    search_query = formulate_search_query_in_english(question)
    query_vector = embed_text(search_query)
    return search_similar_chunks(
        query_vector=query_vector,
        top_k=k,
        filter_doc_id=filter_doc_id,
        filter_file_hash=filter_file_hash,
    )
