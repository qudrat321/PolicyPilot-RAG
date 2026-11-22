"""Pydantic data schemas for API requests, responses, and citations."""
from typing import List, Optional
from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Represents a verified document source linked to an answer."""
    citation_id: str = Field(description="Bracketed tag such as [1] or [2]")
    filename: str = Field(description="Name of the source document")
    page_or_section: str = Field(description="Page number, section title, or spreadsheet sheet name")
    snippet: str = Field(description="Brief text passage supporting the claim")


class ChunkDetail(BaseModel):
    """Detailed metadata for a retrieved document passage."""
    chunk_id: str
    doc_id: str
    filename: str
    page_or_section: str
    sheet_name: Optional[str] = None
    row_range: Optional[str] = None
    score: float
    text: str


class AskRequest(BaseModel):
    """Incoming request when a user asks a policy question."""
    question: str = Field(..., min_length=1, max_length=500, description="Visitor query")
    doc_id: Optional[str] = Field(default=None, description="Optional doc_id to scope retrieval to a specific document")
    file_hash: Optional[str] = Field(default=None, description="Optional file_hash to scope retrieval")
    history: Optional[List[dict]] = Field(default_factory=list, description="Recent conversation history turns")


class AskResponse(BaseModel):
    """Structured response containing the grounded answer, citations, and inspection data."""
    question: str
    answer: str
    is_refusal: bool = Field(default=False, description="True if question cannot be answered from documents")
    citations: List[Citation] = Field(default_factory=list)
    retrieved_chunks: List[ChunkDetail] = Field(default_factory=list)


class DocumentSummary(BaseModel):
    """Summary of an uploaded document in the system."""
    doc_id: str
    filename: str
    file_type: str
    chunk_count: int
    created_at: str


class HealthResponse(BaseModel):
    """System health check response."""
    status: str
    environment: str
    qdrant_connected: bool
    qdrant_collection: str
