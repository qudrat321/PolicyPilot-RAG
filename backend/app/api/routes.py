"""FastAPI route handlers for document management, search, and QA with citations."""
import asyncio
import time
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.schemas import (
    DocumentSummary,
    AskRequest,
    AskResponse,
    ChunkDetail,
)
from app.ingestion.validation import validate_file, compute_file_hash
from app.ingestion.chunking import chunk_document
from app.services.embeddings import embed_batch
from app.services.vector_store import (
    upsert_document_chunks,
    delete_document_vectors,
    find_document_by_hash,
)
from app.services.retrieval import retrieve_context
from app.services.generation import generate_grounded_answer

router = APIRouter(prefix="/api", tags=["Policy Engine"])

# In-memory document registry for listing uploaded files in the UI
DOCUMENT_REGISTRY: dict = {}


def _sync_upload(filename: str, content: bytes) -> dict:
    """Synchronous file indexing worker executed in a threadpool."""
    file_hash = compute_file_hash(content)
    existing_in_qdrant = find_document_by_hash(file_hash)

    if existing_in_qdrant:
        doc_id = existing_in_qdrant["doc_id"]
        DOCUMENT_REGISTRY[doc_id] = {
            "doc_id": doc_id,
            "filename": existing_in_qdrant.get("filename", filename),
            "file_type": filename.rsplit(".", 1)[-1].lower() if "." in filename else "doc",
            "file_hash": file_hash,
            "chunk_count": "Reused",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        return {
            "status": "reused",
            "doc_id": doc_id,
            "filename": existing_in_qdrant.get("filename", filename),
            "file_hash": file_hash,
            "message": "Reused existing embeddings from Qdrant Cloud (0 tokens spent).",
        }

    # New document: Chunk and attach file_hash
    doc_id = str(uuid.uuid4())[:8]
    chunks = chunk_document(filename=filename, content=content, doc_id=doc_id)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text or tabular data could be extracted from the file.",
        )

    for c in chunks:
        c["file_hash"] = file_hash

    # Generate embeddings & upsert to Qdrant Cloud
    texts = [c["text"] for c in chunks]
    vectors = embed_batch(texts)
    upserted_count = upsert_document_chunks(chunks, vectors)

    # Record in registry
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown"
    DOCUMENT_REGISTRY[doc_id] = {
        "doc_id": doc_id,
        "filename": filename,
        "file_type": ext,
        "file_hash": file_hash,
        "chunk_count": upserted_count,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    return {
        "status": "indexed",
        "doc_id": doc_id,
        "filename": filename,
        "file_hash": file_hash,
        "chunks_indexed": upserted_count,
    }


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """Upload or reuse policy documents using persistent Qdrant SHA-256 deduplication."""
    content = await file.read()
    filename = file.filename or "untitled"

    # Validate file size and format
    is_valid, err_msg = validate_file(filename, content)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    return await asyncio.to_thread(_sync_upload, filename, content)


@router.get("/documents", response_model=List[DocumentSummary])
async def list_documents():
    """List all indexed documents and their chunk counts."""
    return [
        DocumentSummary(
            doc_id=meta["doc_id"],
            filename=meta["filename"],
            file_type=meta["file_type"],
            chunk_count=int(meta["chunk_count"]) if isinstance(meta["chunk_count"], int) else 1,
            created_at=meta["created_at"],
        )
        for meta in DOCUMENT_REGISTRY.values()
    ]


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Purge a document record and delete all associated vectors from Qdrant Cloud."""
    await asyncio.to_thread(delete_document_vectors, doc_id)
    if doc_id in DOCUMENT_REGISTRY:
        del DOCUMENT_REGISTRY[doc_id]
    return {"status": "deleted", "doc_id": doc_id}


def _sync_ask(question: str, doc_id: str = None, file_hash: str = None) -> AskResponse:
    """Worker function for retrieval and generation executed in threadpool."""
    chunks = retrieve_context(
        question=question,
        filter_doc_id=doc_id,
        filter_file_hash=file_hash,
    )
    answer, citations, is_refusal = generate_grounded_answer(question, chunks)
    retrieved_details = [
        ChunkDetail(
            chunk_id=c.get("chunk_id", ""),
            doc_id=c.get("doc_id", ""),
            filename=c.get("filename", ""),
            page_or_section=c.get("page_or_section", ""),
            sheet_name=c.get("sheet_name"),
            row_range=c.get("row_range"),
            score=c.get("score", 0.0),
            text=c.get("text", ""),
        )
        for c in chunks
    ]
    return AskResponse(
        question=question,
        answer=answer,
        is_refusal=is_refusal,
        citations=citations,
        retrieved_chunks=retrieved_details,
    )


@router.post("/ask", response_model=AskResponse)
async def ask_policy_question(payload: AskRequest):
    """Retrieve relevant chunks (with optional document scoping) and generate a grounded answer."""
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty.")

    return await asyncio.to_thread(
        _sync_ask,
        question=question,
        doc_id=payload.doc_id,
        file_hash=payload.file_hash,
    )
