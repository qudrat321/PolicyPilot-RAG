"""Anti-hallucination guardrails: score-based refusal and citation cross-validation."""
import re
from typing import List, Dict, Any, Tuple
from app.config import settings
from app.schemas import Citation

REFUSAL_MESSAGE = "The provided documents do not contain sufficient information to answer this question."

def get_refusal_message(question: str) -> str:
    """Return refusal message matching the language and script of the user question."""
    if not question:
        return REFUSAL_MESSAGE
    q = question.strip().lower()
    # Check if Urdu script
    if any('\u0600' <= char <= '\u06FF' for char in question):
        return "فراہم کردہ دستاویزات میں اس سوال کا جواب دینے کے لیے کافی معلومات موجود نہیں ہیں۔"
    # Check if Roman Urdu
    roman_urdu_words = ["kya", "hai", "hain", "kaise", "kaisay", "mein", "batao", "chutti", "miley", "milegi", "sakta", "sakti", "maloomat", "bhi"]
    if any(w in q.split() for w in roman_urdu_words) or "urdu" in q:
        return "Dastiyab documents mein is sawal ka jawab dainay ke liye kafi maloomat mojood nahi hain."
    return REFUSAL_MESSAGE


def is_refusal_required(chunks: List[Dict[str, Any]], threshold: float = None) -> bool:
    """Return True if evidence is weak or absent, saving LLM tokens by refusing immediately."""
    min_score = threshold if threshold is not None else settings.similarity_threshold
    if not chunks:
        return True
    max_score = max(c.get("score", 0.0) for c in chunks)
    return max_score < min_score


def validate_and_clean_citations(
    answer: str,
    retrieved_chunks: List[Dict[str, Any]],
) -> Tuple[str, List[Citation]]:
    """Verify that cited [X] numbers point to real retrieved chunks and strip hallucinated tags."""
    if not answer or not retrieved_chunks:
        return answer, []

    # Find all citation tags like [1], [2]
    found_tags = re.findall(r"\[(\d+)\]", answer)
    verified_citations = []
    seen_indices = set()

    for tag in found_tags:
        idx = int(tag) - 1  # Convert to 0-based index
        if 0 <= idx < len(retrieved_chunks) and idx not in seen_indices:
            seen_indices.add(idx)
            chunk = retrieved_chunks[idx]
            snippet = chunk.get("text", "")
            if len(snippet) > 160:
                snippet = snippet[:157] + "..."

            verified_citations.append(
                Citation(
                    citation_id=f"[{idx + 1}]",
                    filename=chunk.get("filename", "Unknown Document"),
                    page_or_section=chunk.get("page_or_section", "Document Section"),
                    snippet=snippet,
                )
            )

    # Strip any fabricated citation tag referencing an out-of-bounds index (e.g. [9] when only 4 chunks exist)
    clean_answer = re.sub(
        r"\[(\d+)\]",
        lambda m: m.group(0) if 1 <= int(m.group(1)) <= len(retrieved_chunks) else "",
        answer,
    ).strip()

    return clean_answer, verified_citations
