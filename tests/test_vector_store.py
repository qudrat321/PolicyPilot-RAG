"""Integration tests for Google GenAI embeddings and Qdrant Cloud vector store (Move 2 & Deduplication)."""
import pytest
from app.services.embeddings import embed_text, embed_batch, VECTOR_DIMENSION
from app.services.vector_store import (
    check_qdrant_health,
    upsert_document_chunks,
    search_similar_chunks,
    delete_document_vectors,
    find_document_by_hash,
    enforce_storage_quota,
)


def test_embedding_generation():
    """Verify Google GenAI produces 768-dimensional embedding vectors."""
    text = "The organization provides a $500 home office equipment stipend."
    vector = embed_text(text)
    assert isinstance(vector, list)
    assert len(vector) == VECTOR_DIMENSION

    # Test batch embedding
    texts = ["First policy rule.", "Second policy rule."]
    vectors = embed_batch(texts, batch_size=2)
    assert len(vectors) == 2
    assert len(vectors[0]) == VECTOR_DIMENSION
    assert len(vectors[1]) == VECTOR_DIMENSION


def test_qdrant_cloud_connection():
    """Verify active connection to Qdrant Cloud free cluster."""
    assert check_qdrant_health() is True


def test_qdrant_upsert_search_and_delete():
    """End-to-end test: upsert chunks with hash, perform similarity search, and delete."""
    test_doc_id = "test_doc_999"
    test_hash = "fake_sha256_hash_12345"
    test_chunk = {
        "chunk_id": f"{test_doc_id}_001",
        "doc_id": test_doc_id,
        "filename": "per_diem_policy.csv",
        "file_hash": test_hash,
        "page_or_section": "CSV_Data",
        "sheet_name": "Rates",
        "row_range": "1-5",
        "text": "Daily meal allowance in New York City is $75 USD.",
        "is_table": True,
    }

    # 1. Generate embedding
    vector = embed_text(test_chunk["text"])

    # 2. Upsert into Qdrant
    upserted_count = upsert_document_chunks([test_chunk], [vector])
    assert upserted_count == 1

    # 3. Test persistent deduplication lookup by SHA-256 hash
    found_doc = find_document_by_hash(test_hash)
    assert found_doc is not None
    assert found_doc["doc_id"] == test_doc_id
    assert found_doc["filename"] == "per_diem_policy.csv"

    # 4. Search with semantic query (Global search)
    query_vector = embed_text("How much is the meal allowance in NYC?")
    results = search_similar_chunks(query_vector, top_k=2)
    assert len(results) > 0

    top_hit = results[0]
    assert top_hit["doc_id"] == test_doc_id
    assert "New York City" in top_hit["text"]

    # 5. Search with Scoped Retrieval (matching doc_id)
    scoped_results = search_similar_chunks(query_vector, top_k=2, filter_doc_id=test_doc_id)
    assert len(scoped_results) > 0
    assert all(r["doc_id"] == test_doc_id for r in scoped_results)

    # Scoped Retrieval with non-matching doc_id should return 0 results
    non_matching = search_similar_chunks(query_vector, top_k=2, filter_doc_id="non_existent_doc")
    assert len(non_matching) == 0

    # 6. Clean up: Delete test document
    deleted = delete_document_vectors(test_doc_id)
    assert deleted is True

    # 7. Verify deletion
    post_delete_results = search_similar_chunks(query_vector, top_k=4)
    matching_deleted = [r for r in post_delete_results if r["doc_id"] == test_doc_id]
    assert len(matching_deleted) == 0


def test_storage_quota_guard():
    """Verify that quota check handles capacity safely without errors."""
    evicted = enforce_storage_quota(max_vectors=999999)  # High limit -> no eviction
    assert evicted is None
