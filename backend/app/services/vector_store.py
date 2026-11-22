"""Vector store service managing Qdrant Cloud collections, upserts, deduplication, and LRU eviction."""
import time
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from app.config import settings
from app.services.embeddings import VECTOR_DIMENSION

_client_instance: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """Return a singleton QdrantClient connected to Qdrant Cloud or local path."""
    global _client_instance
    if _client_instance is None:
        if settings.qdrant_url and settings.qdrant_api_key:
            _client_instance = QdrantClient(
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key,
                timeout=15,
            )
        else:
            _client_instance = QdrantClient(path="./qdrant_data")
    return _client_instance


def ensure_collection_exists(collection_name: str = None) -> str:
    """Check if collection exists in Qdrant, creating it and required payload indexes."""
    col_name = collection_name or settings.qdrant_collection
    client = get_qdrant_client()
    collections = [c.name for c in client.get_collections().collections]

    if col_name not in collections:
        client.create_collection(
            collection_name=col_name,
            vectors_config=qmodels.VectorParams(
                size=VECTOR_DIMENSION,
                distance=qmodels.Distance.COSINE,
            ),
        )

    # 1. Payload index on doc_id for document deletion
    try:
        client.create_payload_index(
            collection_name=col_name,
            field_name="doc_id",
            field_schema=qmodels.PayloadSchemaType.KEYWORD,
        )
    except Exception:
        pass

    # 2. Payload index on file_hash for instant deduplication lookup
    try:
        client.create_payload_index(
            collection_name=col_name,
            field_name="file_hash",
            field_schema=qmodels.PayloadSchemaType.KEYWORD,
        )
    except Exception:
        pass

    return col_name


def find_document_by_hash(file_hash: str, collection_name: str = None) -> Optional[Dict[str, Any]]:
    """Look up an existing document in Qdrant by its SHA-256 hash to reuse embeddings."""
    if not file_hash:
        return None

    col_name = ensure_collection_exists(collection_name)
    client = get_qdrant_client()

    points, _ = client.scroll(
        collection_name=col_name,
        scroll_filter=qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key="file_hash",
                    match=qmodels.MatchValue(value=file_hash),
                )
            ]
        ),
        limit=1,
        with_payload=True,
    )

    if points:
        payload = points[0].payload or {}
        return {
            "doc_id": payload.get("doc_id"),
            "filename": payload.get("filename"),
            "file_hash": file_hash,
            "created_at": payload.get("created_at"),
        }
    return None


def enforce_storage_quota(collection_name: str = None, max_vectors: int = None) -> Optional[str]:
    """LRU Eviction: Remove the oldest document if cluster vector count exceeds safe limit."""
    limit = max_vectors or settings.max_total_vectors
    col_name = ensure_collection_exists(collection_name)
    client = get_qdrant_client()

    count_res = client.count(collection_name=col_name)
    if count_res.count < limit:
        return None  # Within safe capacity

    # Fetch a batch of points to find the document with the oldest created_at timestamp
    points, _ = client.scroll(
        collection_name=col_name,
        limit=50,
        with_payload=True,
    )

    if not points:
        return None

    # Identify the oldest doc_id
    oldest_point = min(points, key=lambda p: (p.payload or {}).get("created_at", 0))
    oldest_doc_id = (oldest_point.payload or {}).get("doc_id")

    if oldest_doc_id:
        delete_document_vectors(oldest_doc_id, collection_name=col_name)
        return oldest_doc_id
    return None


def upsert_document_chunks(
    chunks: List[Dict[str, Any]],
    vectors: List[List[float]],
    collection_name: str = None,
) -> int:
    """Save chunk vectors and full text payloads into Qdrant Cloud with LRU check."""
    if not chunks or not vectors or len(chunks) != len(vectors):
        return 0

    col_name = ensure_collection_exists(collection_name)
    client = get_qdrant_client()

    # Enforce cluster storage quota before inserting new vectors
    enforce_storage_quota(col_name)

    now_ts = int(time.time())
    points = []

    for chunk, vector in zip(chunks, vectors):
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk["chunk_id"]))
        points.append(
            qmodels.PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "chunk_id": chunk["chunk_id"],
                    "doc_id": chunk["doc_id"],
                    "filename": chunk["filename"],
                    "file_hash": chunk.get("file_hash", ""),
                    "page_or_section": chunk["page_or_section"],
                    "sheet_name": chunk.get("sheet_name"),
                    "row_range": chunk.get("row_range"),
                    "text": chunk["text"],
                    "is_table": chunk.get("is_table", False),
                    "created_at": chunk.get("created_at", now_ts),
                },
            )
        )

    client.upsert(collection_name=col_name, points=points)
    return len(points)


def search_similar_chunks(
    query_vector: List[float],
    top_k: int = 4,
    collection_name: str = None,
    filter_doc_id: Optional[str] = None,
    filter_file_hash: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Query Qdrant for top-k nearest chunks with optional scoping by doc_id or file_hash."""
    col_name = ensure_collection_exists(collection_name)
    client = get_qdrant_client()

    # Optional scoping filter
    must_conditions = []
    if filter_doc_id:
        must_conditions.append(
            qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=filter_doc_id))
        )
    if filter_file_hash:
        must_conditions.append(
            qmodels.FieldCondition(key="file_hash", match=qmodels.MatchValue(value=filter_file_hash))
        )

    query_filter = qmodels.Filter(must=must_conditions) if must_conditions else None

    search_result = client.query_points(
        collection_name=col_name,
        query=query_vector,
        query_filter=query_filter,
        limit=top_k,
        with_payload=True,
    )

    results = []
    for hit in search_result.points:
        payload = hit.payload or {}
        results.append({
            "chunk_id": payload.get("chunk_id"),
            "doc_id": payload.get("doc_id"),
            "filename": payload.get("filename"),
            "file_hash": payload.get("file_hash"),
            "page_or_section": payload.get("page_or_section"),
            "sheet_name": payload.get("sheet_name"),
            "row_range": payload.get("row_range"),
            "text": payload.get("text", ""),
            "score": round(float(hit.score), 4),
        })
    return results


def delete_document_vectors(doc_id: str, collection_name: str = None) -> bool:
    """Delete all vector points associated with a specific document ID."""
    col_name = ensure_collection_exists(collection_name)
    client = get_qdrant_client()
    client.delete(
        collection_name=col_name,
        points_selector=qmodels.FilterSelector(
            filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="doc_id",
                        match=qmodels.MatchValue(value=doc_id),
                    )
                ]
            )
        ),
    )
    return True


def check_qdrant_health() -> bool:
    """Probe Qdrant Cloud to check if the cluster is reachable and healthy."""
    try:
        client = get_qdrant_client()
        client.get_collections()
        return True
    except Exception:
        return False
