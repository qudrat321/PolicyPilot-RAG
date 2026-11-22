# PolicyPilot RAG: Living Task & Agent Verification Checklist

Track implementation progress and agent verification checks for each phase.

---

## Progress Overview

| Phase | Description | Status | Verification Gate |
|---|---|---|---|
| **Phase 0** | Project Scaffolding & Environment Setup | [x] Completed | Environment variables & lightweight dependencies validated |
| **Move 1** | Ingestion Engine & Tabular Chunking (PDF, DOCX, CSV, Multi-Sheet XLSX) | [x] Completed | Unit tests pass on sample documents with metadata intact (5/5 passed) |
| **Move 2** | Google Embeddings & Qdrant Cloud Client | [x] Completed | Live batch embed & vector upsert/query verified on Qdrant Cloud (3/3 passed) |
| **Move 3** | Retrieval, Grounded Generation & Guardrails | [x] Completed | Deterministic refusal & citation cross-checking verified (3/3 passed) |
| **Move 4** | Golden Set Evaluation Suite (Hit@k, MRR, Faithfulness) | [x] Completed | 25-question golden benchmark (Hit@3: 100%, MRR: 1.0, Refusal: 100%) |
| **Move 5** | FastAPI REST Endpoints & Integration Tests | [x] Completed | All REST endpoints tested and passing (3/3 passed) |
| **Move 6** | React + Vite UI & Cloud Deployment Config | [x] Completed | Complete UI with cold-start status probe & render.yaml deployment config |

---

## Detailed Task Breakdown & Agent Verification Gates

### Phase 0: Scaffolding & Environment
- [ ] Create `requirements.txt` with lightweight, zero-PyTorch packages.
- [ ] Create `.env.example` with Google AI Studio and Qdrant Cloud keys.
- [ ] Initialize repository structure (`app/`, `evals/`, `tests/`, `data/`).
- **Agent Verification Gate**:
  - Run syntax/import check on core libraries.
  - Verify container memory footprint remains $< 100\text{ MB}$.

---

### Move 1: Ingestion Engine & Tabular Parsers
- [ ] `app/ingestion/validation.py`: File size check (max 5MB), MIME type check, SHA-256 deduplication.
- [ ] `app/ingestion/extractors.py`:
  - [ ] PDF parser with PyMuPDF (page retention).
  - [ ] DOCX parser with python-docx (heading detection).
  - [ ] PPTX parser with python-pptx (slide retention).
  - [ ] TXT & Markdown parser.
  - [ ] HTML parser with BeautifulSoup4 (script/nav removal).
- [ ] `app/ingestion/table_extractors.py`:
  - [ ] CSV parser with standard `csv` library.
  - [ ] Multi-sheet Excel parser with `openpyxl` (`read_only=True` mode).
  - [ ] Sheet overview summary generation.
- [ ] `app/ingestion/chunking.py`:
  - [ ] Text chunker with sliding window and token overlap.
  - [ ] Header-preserving Markdown chunker for tabular data (5–10 rows/chunk).
- **Agent Verification Gate**:
  - Run ingestion tests on test fixtures for each file type.
  - Assert chunks retain `filename`, `page_or_section`, `sheet_name`, and repeated headers.

---

### Move 2: Google Embeddings & Qdrant Integration
- [ ] `app/config.py`: Pydantic settings loading `.env`.
- [ ] `app/services/embeddings.py`:
  - [ ] Google `text-embedding-004` client (768-dim).
  - [ ] Batching utility (up to 20 texts per request).
- [ ] `app/services/vector_store.py`:
  - [ ] Qdrant Cloud client initialization with retries.
  - [ ] Collection creation with Cosine similarity.
  - [ ] Upsert with full payload (text snippet, filename, sheet, page).
  - [ ] Delete vectors by `doc_id`.
- **Agent Verification Gate**:
  - Upsert test points to Qdrant.
  - Perform similarity search and verify top match score $> 0.70$.

---

### Move 3: Retrieval, Grounded Generation & Guardrails
- [ ] `app/services/retrieval.py`: Top-k query search and score filtering.
- [ ] `app/services/guardrails.py`:
  - [ ] Low-confidence refusal threshold ($\text{score} < 0.65 \implies 0$ LLM tokens spent).
  * [ ] Citation ID cross-validation (assert every `[X]` is in retrieved chunks).
  * [ ] Prompt injection defense (system instructions separating data from command).
- [ ] `app/services/generation.py`:
  - [ ] Gemini 1.5/2.0 Flash prompt builder.
  - [ ] Strict grounding instructions and citation formatting.
- **Agent Verification Gate**:
  - Verify unanswerable question triggers deterministic refusal without calling Gemini.
  - Verify answerable question includes valid citations linking back to chunk IDs.

---

### Move 4: Golden Evaluation Suite
- [ ] `evals/golden_set.jsonl`: 25 test questions (20 answerable, 5 unanswerable).
- [ ] `evals/metrics.py`: Hit@k, Recall@k, MRR calculation.
- [ ] `evals/run_eval.py`:
  - [ ] Retrieval evaluation runner.
  - [ ] Throttled LLM-as-a-judge (5-second sleep to respect 15 RPM).
  - [ ] Export results to `evals/results/run_latest.json`.
- **Agent Verification Gate**:
  - Run evaluation suite: confirm Hit@3 $\ge 85\%$ and zero HTTP 429 quota errors.

---

### Move 5: FastAPI REST Endpoints & Tests
- [ ] `app/schemas.py`: Request/response schemas with Pydantic v2.
- [ ] `app/api/routes.py`:
  - [ ] `POST /api/documents` (upload & ingest).
  - [ ] `GET /api/documents` (list documents & vector counts).
  - [ ] `DELETE /api/documents/{doc_id}` (purge document & vectors).
  - [ ] `POST /api/ask` (retrieve, ground, answer, cite).
  - [ ] `GET /health` (Qdrant & service status).
- [ ] `app/main.py`: CORS configuration, exception handlers, rate limiter (`slowapi`).
- [ ] `tests/`: End-to-end tests for all endpoints.
- **Agent Verification Gate**:
  - Run `pytest tests/ -v`. All tests pass.

---

### Move 6: React Frontend & Cloud Deployment
- [ ] `frontend/`:
  - [ ] Document management view (upload, status, delete).
  - [ ] Query interface with streaming/grounded answers.
  - [ ] Interactive citation badges and chunk inspector (displaying scores, sheet/page, text).
  - [ ] Backend cold-start warm-up banner.
- [ ] Deployment artifacts:
  - [ ] `render.yaml` for zero-cost backend hosting.
  - [ ] Vercel/Cloudflare build configuration for frontend.
  - [ ] `README.md` and `DESIGN.md`.
- **Agent Verification Gate**:
  - Production build verification (`npm run build`).
  - End-to-end test on deployed environment.
