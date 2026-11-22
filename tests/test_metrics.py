"""Tests for evaluation metrics calculation."""
from evals.metrics import calculate_hit_at_k, calculate_mrr, aggregate_retrieval_metrics


def test_hit_at_k_and_mrr():
    """Verify Hit@k and MRR calculations."""
    retrieved = ["doc_b.pdf", "remote_work_policy.md", "doc_c.pdf"]
    expected = "remote_work_policy.md"

    # In rank 2 -> Hit is 1.0, MRR is 1/2 = 0.5
    assert calculate_hit_at_k(retrieved, expected) == 1.0
    assert calculate_mrr(retrieved, expected) == 0.5

    # If missing -> Hit is 0.0, MRR is 0.0
    assert calculate_hit_at_k(retrieved, "missing.pdf") == 0.0
    assert calculate_mrr(retrieved, "missing.pdf") == 0.0


def test_aggregate_metrics():
    """Verify metric aggregation across multiple evaluation results."""
    results = [
        {"is_answerable": True, "hit": 1.0, "mrr": 1.0},
        {"is_answerable": True, "hit": 1.0, "mrr": 0.5},
        {"is_answerable": False, "hit": 0.0, "mrr": 0.0},  # Unanswerable should be excluded from retrieval metrics
    ]
    summary = aggregate_retrieval_metrics(results)
    assert summary["hit_rate"] == 1.0
    assert summary["mrr"] == 0.75
    assert summary["total_answerable"] == 2
