"""Integration tests for grounded generation and anti-hallucination guardrails (Move 3)."""
import pytest
from app.services.guardrails import (
    is_refusal_required,
    validate_and_clean_citations,
    REFUSAL_MESSAGE,
)
from app.services.generation import generate_grounded_answer


def test_deterministic_refusal_on_low_score():
    """Verify that chunks with similarity scores < 0.65 trigger instant refusal without LLM calls."""
    weak_chunks = [
        {
            "chunk_id": "c1",
            "score": 0.45,
            "filename": "policy.pdf",
            "page_or_section": "Page 1",
            "text": "Unrelated text about office parking rules.",
        }
    ]
    assert is_refusal_required(weak_chunks, threshold=0.65) is True

    answer, citations, is_refusal = generate_grounded_answer(
        question="What is the meal allowance in Tokyo?",
        chunks=weak_chunks,
    )
    assert is_refusal is True
    assert answer == REFUSAL_MESSAGE
    assert len(citations) == 0


def test_citation_cleaning_and_verification():
    """Verify that valid citation numbers [1] are kept while invalid out-of-bounds tags [9] are stripped."""
    chunks = [
        {
            "chunk_id": "c1",
            "filename": "travel_rates.csv",
            "page_or_section": "Rates Sheet",
            "text": "Daily meal allowance in NYC is $75 USD.",
        }
    ]

    mock_answer = "The allowance is $75 [1], but other expenses apply [9]."
    clean_answer, citations = validate_and_clean_citations(mock_answer, chunks)

    # [1] should be verified
    assert len(citations) == 1
    assert citations[0].citation_id == "[1]"
    assert citations[0].filename == "travel_rates.csv"

    # [9] should be stripped from text because only 1 chunk was provided
    assert "[9]" not in clean_answer
    assert "[1]" in clean_answer


@pytest.mark.integration
def test_live_grounded_generation():
    """Verify Gemini Flash answers accurately and cites the provided context block."""
    valid_chunks = [
        {
            "chunk_id": "rw_001",
            "score": 0.88,
            "filename": "remote_work_policy.md",
            "page_or_section": "3. Home Office Equipment Reimbursement",
            "text": "The organization provides a one-time home office equipment stipend of up to $500 USD for eligible remote employees.",
        }
    ]

    answer, citations, is_refusal = generate_grounded_answer(
        question="How much is the home office equipment stipend?",
        chunks=valid_chunks,
    )

    assert is_refusal is False
    assert "$500" in answer
    assert len(citations) >= 1
    assert citations[0].filename == "remote_work_policy.md"
