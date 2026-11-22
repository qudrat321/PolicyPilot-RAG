# PolicyPilot RAG: Enterprise-Grade Public Policy Assistant
## Zero-Cost, Cloud-Native Architecture & Step-by-Step Implementation Blueprint

---

## 1. Executive Summary & Objective

**PolicyPilot RAG** is an open-source, production-minded Retrieval-Augmented Generation (RAG) assistant designed for querying public policy and organizational procedure documents (handbooks, travel allowances, compliance checklists, compensation sheets).

### Core Principles
1. **100% True Zero-Cost**: Runs entirely on generous free tiers (Render/HF Spaces, Vercel, Qdrant Cloud, Google AI Studio) with **$0 cloud bill**.
2. **Low-Memory & High Performance**: Operates safely inside a **512MB RAM container** by eliminating heavy PyTorch/Sentence-Transformers dependencies in favor of cloud-native embeddings (`text-embedding-004`) or lightweight ONNX.
3. **Tabular & Multi-Sheet Mastery**: Native support for CSV and multi-sheet Excel (`.xlsx`) files via streaming `openpyxl`, header-preserving Markdown chunking, and sheet-level metadata.
4. **Token Efficiency**: Compact prompt designs, deterministic pre-checks before LLM calls, and precise context pruning to minimize quota consumption under Gemini's 15 RPM free tier.
5. **Rigorous Verification Gates**: Step-by-step "Agent Checks" with explicit automated tests and verification commands before advancing to the next move.

---

## 2. System Architecture & Component Selection

![System Architecture](assets/system_architecture.png)

```mermaid
flowchart TD
    subgraph Client [Client Layer - Vercel / Cloudflare]
        UI[React + Vite Frontend\nInstant CDN Load - 0s Cold Start]
    end

    subgraph Backend [Compute Layer - Render Free / HF Spaces - 512MB RAM]
        API[FastAPI Gateway]
        VAL[Pydantic Validation & Hash Duplication]
        ING[Ingestion Engine\nPyMuPDF, python-docx, openpyxl]
        CHK[Header-Preserving Chunking Engine]
        RET[Retrieval & Citation Engine]
        GRD[Deterministic Guardrails & Refusal Engine]
    end

    subgraph CloudServices [External Free Services - $0 Cost]
        QD[(Qdrant Cloud Free\nVector Storage + Payload Snippets)]
        GEM_EMB[Google AI Studio\ntext-embedding-004\nZero-RAM / High Precision]
        GEM_LLM[Google AI Studio\nGemini 1.5 / 2.0 Flash\nAnswer Generation & Eval Judge]
    end

    UI -->|REST / CORS| API
    API --> VAL
    VAL --> ING --> CHK
    CHK -->|Batch Embed| GEM_EMB
    GEM_EMB -->|Vector + Payload| QD

    UI -->|POST /api/ask| RET
    RET -->|Query Vector| GEM_EMB
    RET -->|Similarity Search| QD
    QD -->|Top-k Chunks + Scores| GRD
    GRD -->|Evidence Verified| GEM_LLM
    GEM_LLM -->|Strict Grounded Answer| RET
    RET -->|Answer + Citations + Chunks| UI
```

### Component Matrix

| Layer | Technology | Justification & Zero-Cost Limits |
|---|---|---|
| **Frontend** | React (Vite) + Tailwind CSS | Deployed on **Vercel** or **Cloudflare Pages**. 0-second page load; eliminates user-facing Render 60s cold-start delay. |
| **Backend** | FastAPI + Uvicorn + Pydantic v2 | Deployed on **Render Free Web Service** (or Hugging Face Spaces Docker). Strict asynchronous routing and payload validation. |
| **Vector DB** | Qdrant Cloud Free Tier | 1GB RAM / 4GB storage cluster. Chunks and text snippets are stored directly in vector payloads, eliminating the need for paid cloud buckets (S3/GCS). |
| **Embeddings** | Google `text-embedding-004` (768-dim) | Called via Google GenAI SDK. Replaces heavy PyTorch `sentence-transformers` (saving 800MB RAM and build size). |
| **Generation LLM** | Gemini 1.5 / 2.0 Flash | Free tier on Google AI Studio (15 RPM / 1,500 RPD / 1M TPM). Fast inference, high context faithfulness. |
| **Doc Parsers** | PyMuPDF, python-docx, python-pptx, openpyxl, BeautifulSoup4 | Native streaming extraction. `openpyxl` runs with `read_only=True` to prevent memory blowups on Excel files. |
| **Evaluation** | Custom runner + Golden Set (25 Qs) | Deterministic metric checks (Hit@k, MRR) + throttled LLM-as-a-judge (5s delay between calls to respect 15 RPM limit). |

---

## 3. Token & Performance Optimization Strategy

![Anti-Hallucination 3-Layer Firewall](assets/anti_hallucination_firewall.png)

To guarantee enterprise-grade speed and stay strictly within free-tier rate limits:

1. **Deterministic Refusal (0 LLM Tokens Spent)**:
   * If Qdrant returns top-k chunks where all cosine similarity scores fall below the threshold ($\text{score} < 0.65$), the API immediately returns a standardized refusal:
     > *"The provided documents do not contain sufficient information to answer this question."*
   * **Result**: Saves 100% of LLM generation tokens and prevents hallucinated responses.

2. **Precise Prompt Compression**:
   * System prompt uses concise, high-density instructions with structural tags:
     ```text
     Context:
     [1] (Doc: Travel.pdf, Page 4): "Per diem meal allowance in NYC is $75."
     [2] (Doc: Expense.xlsx, Sheet: PerDiem, Rows 1-5): "Lodging cap: $250/night."
     
     Rules: Answer ONLY based on the context above. Cite using [1], [2]. If not found, output REFUSE.
     ```

3. **Rate Limiting & Throttling**:
   * Integrate `slowapi` on `/api/ask` (5 requests/minute per IP) to prevent public visitors from draining the 15 RPM Gemini quota.
   * Evaluation runner incorporates `time.sleep(5)` and `tenacity` exponential backoff to handle transient `429 Too Many Requests`.

---

## 4. Multi-Sheet Spreadsheet & Document Handling

### A. Document Parsing Specifications
* **PDF (`PyMuPDF`)**: Page-level boundary tracking; text cleaned of duplicate headers/footers.
* **DOCX (`python-docx`)**: Structural heading inspection (Heading 1/2/3) mapped to metadata sections.
* **PPTX (`python-pptx`)**: Slide-by-slide text extraction with slide number tracking.
* **CSV (`csv` standard library)**: Native row streaming without memory overhead.
* **Excel (`openpyxl` with `read_only=True`)**:
  * Extracts all valid sheets.
  * Filters out empty sheets or hidden template tabs.
  * Enforces guardrails: Max 10 sheets per workbook, max 300 rows per sheet for the public demo.

### B. Header-Preserving Markdown Chunking
Tabular data is serialized into Markdown with repeated headers and contextual metadata:

```text
Document: travel_policy_2024.xlsx | Sheet: Lodging_Caps | Category: Domestic
| Metro Area | Maximum Rate (USD) | Effective Quarter |
|------------|--------------------|-------------------|
| New York   | $320               | Q1-Q4             |
| Chicago    | $245               | Q1-Q4             |
| Austin     | $195               | Q1-Q4             |
```

### C. Sheet Summary Overview Chunk
For every multi-sheet workbook, an overarching "Sheet Summary" vector is generated:
```text
Document: travel_policy_2024.xlsx
Total Sheets: 2
- Sheet 'Lodging_Caps': Contains city-specific hotel reimbursement limits.
- Sheet 'Mileage_Rates': Contains vehicle reimbursement rates per mile.
```
This enables accurate answers when users ask high-level questions like *"What expense categories are covered in the spreadsheet?"*.

---

## 5. Qdrant Vector Payload Schema

Every vector in Qdrant contains rich payload metadata, eliminating external object storage:

```json
{
  "doc_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "Employee_Handbook_2024.pdf",
  "file_type": "pdf",
  "chunk_id": "a1b2c3d4_chunk_004",
  "chunk_index": 4,
  "page_or_section": "Page 12, Section 3.2 (Sick Leave)",
  "sheet_name": null,
  "row_range": null,
  "text": "Full text of the extracted chunk stored here for zero-cost instant retrieval...",
  "created_at": "2026-11-22T17:00:00Z"
}
```

---

## 6. Step-by-Step Implementation Roadmap & Agent Verification Gates

![Ingestion & Grounded Query Workflow](assets/ingestion_query_workflow.png)

Every phase must pass its **Agent Verification Check** before moving to the next phase.

```mermaid
flowchart LR
    M1[Move 1: Project Setup & Ingestion Engine] --> M2[Move 2: Embeddings & Qdrant Integration]
    M2 --> M3[Move 3: Retrieval & Grounded Generation]
    M3 --> M4[Move 4: Golden Set & Evaluation Suite]
    M4 --> M5[Move 5: FastAPI REST Endpoints & Tests]
    M5 --> M6[Move 6: React UI & Cloud Deployment]
```

---

### Move 1: Core Ingestion & Tabular Chunking Engine
* **Goal**: Build modular, low-memory parsers for PDF, DOCX, TXT, CSV, and multi-sheet Excel with header-preserving Markdown chunking.
* **Files**:
  * `app/ingestion/extractors.py`
  * `app/ingestion/table_extractors.py`
  * `app/ingestion/chunking.py`
* **Token & Performance Strategy**:
  * Use `openpyxl` with `read_only=True` (no `pandas`).
  * Enforce maximum file size (5MB) and row limits (300 rows) at ingestion time.
* **Agent Verification Gate**:
  * [ ] Create sample PDF, DOCX, CSV, and multi-sheet `.xlsx` files in `data/test_samples/`.
  * [ ] Run automated parsing test: verify extracted chunks retain page numbers, sheet names, and table headers.
  * [ ] Memory check: verify process memory stays $< 120\text{ MB}$.

---

### Move 2: Google Embeddings & Qdrant Cloud Storage
* **Goal**: Integrate Google `text-embedding-004` and Qdrant Cloud client with connection pooling, retries, and schema validation.
* **Files**:
  * `app/config.py`
  * `app/services/embeddings.py`
  * `app/services/vector_store.py`
* **Token & Performance Strategy**:
  * Batch embedding requests (up to 20 texts per batch) to reduce HTTP round trips.
  * Store chunk text inside Qdrant point payload.
* **Agent Verification Gate**:
  * [ ] Upsert test chunks into Qdrant Cloud collection `policy_documents`.
  * [ ] Query nearest neighbor for sample policy query.
  * [ ] Assert top score $> 0.70$ and metadata matches original file.

---

### Move 3: Retrieval, Grounded Generation & Citation Guardrails
* **Goal**: Build top-k similarity search, deterministic score thresholds, Gemini Flash generation, and strict citation cross-validation.
* **Files**:
  * `app/services/retrieval.py`
  * `app/services/generation.py`
  * `app/services/guardrails.py`
* **Token & Performance Strategy**:
  * If max retrieval score $< 0.65$, short-circuit and refuse without calling Gemini.
  * Validate that every cited ID `[X]` corresponds to an actual retrieved chunk.
* **Agent Verification Gate**:
  * [ ] Test query on answerable question: verify correct citation and grounded answer.
  * [ ] Test query on unanswerable question: verify 0 LLM tokens spent and exact refusal message returned.
  * [ ] Test query with prompt injection: verify model treats document content as inert data.

---

### Move 4: Golden Evaluation Suite & Metrics
* **Goal**: Build reproducible evaluation harness with 25 golden questions (20 answerable, 5 unanswerable) assessing Hit@k, MRR, Faithfulness, and Correctness.
* **Files**:
  * `evals/golden_set.jsonl`
  * `evals/run_eval.py`
  * `evals/metrics.py`
* **Token & Performance Strategy**:
  * Implement 5-second sleep between judge calls to strictly respect Gemini's 15 RPM limit.
  * Save evaluation results to `evals/results/run_baseline.json`.
* **Agent Verification Gate**:
  * [ ] Run `python evals/run_eval.py`.
  * [ ] Assert retrieval Hit@3 $\ge 85\%$ and zero HTTP 429 quota exhaustion errors.

---

### Move 5: FastAPI Application, Validation & API Tests
* **Goal**: Expose robust REST API with Pydantic validation, document deletion, health check, and rate limiting.
* **Files**:
  * `app/main.py`
  * `app/schemas.py`
  * `app/api/routes.py`
  * `tests/test_api.py`
* **Token & Performance Strategy**:
  * Return standard HTTP codes (`400` unreadable, `409` duplicate, `413` oversized, `429` rate limit).
  * Unit and integration tests using `pytest` and `httpx.AsyncClient`.
* **Agent Verification Gate**:
  * [ ] Run `pytest tests/ -v`.
  * [ ] All tests pass: file upload, duplicate rejection, question answering, document deletion (verifying vectors removed from Qdrant).

---

### Move 6: React Frontend & Cloud Deployment
* **Goal**: Build responsive, modern React UI (Vite + Tailwind CSS + Lucide Icons) with citation popups, chunk inspector, and deploy to Vercel/Render.
* **Files**:
  * `frontend/` (React app)
  * `render.yaml`
  * `README.md`
  * `DESIGN.md`
* **Token & Performance Strategy**:
  * Frontend handles cold starts gracefully with a warm-up ping to `/health`.
  * Chunk inspector displays exact similarity scores and sheet/page metadata for transparency.
* **Agent Verification Gate**:
  * [ ] Frontend builds with zero TypeScript/lint errors (`npm run build`).
  * [ ] Backend successfully responds to `/health` with Qdrant connectivity status.
  * [ ] Live cloud verification: end-to-end question answering verified on deployed instance.

---

## 7. Next Immediate Move

To begin execution following professional best practices, the immediate next action is:
1. **Initialize Project Scaffold & Dependencies**:
   * Create `requirements.txt` with verified, lightweight, zero-PyTorch dependencies.
   * Create `.env.example` defining necessary credentials (`GEMINI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`).
   * Initialize directory structure: `app/`, `evals/`, `tests/`, `data/`.
2. **Execute Move 1 (Core Ingestion & Tabular Parsers)** with automated test validation.
