"""Formulas for RAG evaluation metrics: Hit@k, Recall@k, and MRR."""
from typing import List, Dict, Any


def calculate_hit_at_k(retrieved_docs: List[str], expected_doc: str) -> float:
    """Return 1.0 if the expected document appears in the retrieved documents, else 0.0."""
    return 1.0 if expected_doc in retrieved_docs else 0.0


def calculate_mrr(retrieved_docs: List[str], expected_doc: str) -> float:
    """Calculate Mean Reciprocal Rank (1 / rank of the first relevant document)."""
    for rank, doc in enumerate(retrieved_docs, start=1):
        if doc == expected_doc:
            return 1.0 / rank
    return 0.0


def aggregate_retrieval_metrics(results: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate average Hit@k and MRR over answerable test questions."""
    answerable = [r for r in results if r.get("is_answerable", True)]
    if not answerable:
        return {"hit_rate": 0.0, "mrr": 0.0, "total_eval": 0}

    avg_hit = sum(r["hit"] for r in answerable) / len(answerable)
    avg_mrr = sum(r["mrr"] for r in answerable) / len(answerable)

    return {
        "hit_rate": round(avg_hit, 4),
        "mrr": round(avg_mrr, 4),
        "total_answerable": len(answerable),
    }
