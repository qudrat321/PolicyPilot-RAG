"""Seeds demo policy documents into Qdrant Cloud vector store."""
import os
from pathlib import Path
from app.ingestion.chunking import chunk_document
from app.services.embeddings import embed_batch
from app.services.vector_store import upsert_document_chunks, ensure_collection_exists

DEMO_DIR = Path("data/sample_policies")


def seed_demo_documents():
    """Extract, chunk, embed, and upsert all sample policy documents into Qdrant."""
    ensure_collection_exists()
    total_upserted = 0

    for file_path in DEMO_DIR.glob("*.*"):
        filename = file_path.name
        with open(file_path, "rb") as f:
            content = f.read()

        doc_id = f"demo_{file_path.stem}"
        chunks = chunk_document(filename=filename, content=content, doc_id=doc_id)
        if not chunks:
            continue

        texts = [c["text"] for c in chunks]
        vectors = embed_batch(texts)
        count = upsert_document_chunks(chunks, vectors)
        total_upserted += count
        print(f"Ingested '{filename}' -> {count} chunks upserted into Qdrant.")

    print(f"Seeding complete! Total chunks in Qdrant: {total_upserted}")
    return total_upserted


if __name__ == "__main__":
    seed_demo_documents()
