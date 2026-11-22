"""Runs reproducible RAG evaluation over the 25-question golden test set."""
import json
import time
from pathlib import Path
from app.services.retrieval import retrieve_context
from app.services.generation import generate_grounded_answer
from evals.metrics import calculate_hit_at_k, calculate_mrr, aggregate_retrieval_metrics

GOLDEN_SET_PATH = Path("evals/golden_set.jsonl")
RESULTS_DIR = Path("evals/results")


def run_evaluation(top_k: int = 3) -> dict:
    """Evaluate retrieval and generation across answerable and unanswerable golden questions."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    results = []

    with open(GOLDEN_SET_PATH, "r", encoding="utf-8") as f:
        test_cases = [json.loads(line) for line in f if line.strip()]

    print(f"Starting evaluation across {len(test_cases)} golden test questions...")

    correct_refusals = 0
    total_unanswerable = 0

    for item in test_cases:
        qid = item["id"]
        question = item["question"]
        is_answerable = item["is_answerable"]
        expected_doc = item.get("expected_doc")

        # 1. Retrieval step
        chunks = retrieve_context(question, top_k=top_k)
        retrieved_docs = [c.get("filename", "") for c in chunks]

        # 2. Generation step
        answer, citations, is_refusal = generate_grounded_answer(question, chunks)

        # 3. Score retrieval metrics if answerable
        if is_answerable:
            hit = calculate_hit_at_k(retrieved_docs, expected_doc)
            mrr = calculate_mrr(retrieved_docs, expected_doc)
        else:
            hit = 0.0
            mrr = 0.0
            total_unanswerable += 1
            if is_refusal:
                correct_refusals += 1

        results.append({
            "id": qid,
            "question": question,
            "is_answerable": is_answerable,
            "expected_doc": expected_doc,
            "retrieved_docs": retrieved_docs,
            "hit": hit,
            "mrr": mrr,
            "answer": answer,
            "is_refusal": is_refusal,
            "citation_count": len(citations),
        })

        print(f"[{qid}] Hit@{top_k}: {hit} | Refusal: {is_refusal} | Q: {question[:45]}...")
        # Small delay to respect 15 RPM quota
        time.sleep(2)

    # 4. Aggregate metrics
    summary = aggregate_retrieval_metrics(results)
    refusal_accuracy = round(correct_refusals / total_unanswerable, 4) if total_unanswerable > 0 else 1.0
    summary["refusal_accuracy"] = refusal_accuracy
    summary["total_questions"] = len(test_cases)
    summary["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    output_payload = {
        "summary": summary,
        "detailed_results": results,
    }

    output_path = RESULTS_DIR / "run_baseline.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)

    print("\n=== EVALUATION SUMMARY ===")
    print(f"Hit@{top_k} Rate: {summary['hit_rate'] * 100:.1f}%")
    print(f"Mean Reciprocal Rank (MRR): {summary['mrr']:.4f}")
    print(f"Refusal Accuracy on Unanswerable: {refusal_accuracy * 100:.1f}%")
    print(f"Saved results to: {output_path}")

    return output_payload


if __name__ == "__main__":
    run_evaluation()
