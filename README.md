# 🧭 PolicyPilot RAG

> **Zero-Cost, High-Performance Public Policy & Procedures Assistant**  
> Built with FastAPI, React (Vite), Qdrant Cloud, and Google Gemini API.  
> Engineered for 100% strict grounding, zero hallucinations, and sub-second retrieval over complex documents and multi-sheet spreadsheets.

---

## 🌟 Key Highlights

- **💸 100% Zero-Cost Cloud Architecture**: Runs completely on generous free tiers (Vercel, Render, Qdrant Cloud Free, Google AI Studio) with **$0 cloud bill**.
- **🛡️ Zero Hallucinations & Strict Grounding**:
  - **Deterministic Refusal**: If chunk similarity score falls below `0.58`, the system immediately refuses to answer without wasting LLM tokens.
  - **Multilingual Guardrails**: Provides grounded refusals in English, native Urdu script, and Roman Urdu matching the user's language.
  - **Citation Verification**: Every fact cites an exact chunk ID `[1]`, `[2]`. The system programmatically checks citations against retrieved IDs before responding.
  - **Data/Instruction Separation**: Treats document text strictly as inert data to defend against prompt injection.
- **📊 Tabular & Multi-Sheet Excel Mastery**:
  - Native streaming extraction for CSV and multi-sheet `.xlsx` files using `openpyxl` with header-preserving Markdown chunking.
  - Interactive **Raw CSV vs. Grid View** toggle directly inside assistant answers.
- **📄 High-Fidelity Executive PDF Export**:
  - **Zero-Distortion PDF Generation**: Single-click PDF export delivering boardroom-ready compliance reports with Deep Slate & Emerald branding, dynamic Purpose & Scope metadata, auto-wrapped table columns, and zero Markdown artifacts (`**`, `*`, `_`).
  - Purged all non-PDF exports (CSV, Excel, Word) across backend and frontend to ensure a focused, uncompromised, and 100% compliant reporting workflow.
- **🌐 Conversational Intelligence & Multilingual Follow-ups**:
  - Full multi-turn conversation memory with support for dynamic translation/reformat requests (e.g. *"above in urdu"*, *"summarize in Roman Urdu"*, *"convert to bullet points"*) without false retrieval rejections.
- **🌓 Dual-Theme Interface (Dark & High-Contrast Normal Mode)**:
  - WCAG AA compliant contrast with class-based Tailwind theming, custom scrollbars, and high-visibility cards.
- **⚡ 512MB RAM Friendly**: Eliminates heavy PyTorch (`sentence-transformers`) in favor of Google `text-embedding-004` / `gemini-embedding-001`, keeping container RAM $< 120\text{ MB}$.

---

## 📸 Application Showcase & User Experience

Explore PolicyPilot RAG's grounded workflow, transparent citations, and executive compliance reporting:

### 1. Central Knowledge Base & Query Dashboard
**Image Source**: [`./docs/assets/main_dasboard.png`](./docs/assets/main_dasboard.png)

<p align="center">
  <img src="./docs/assets/main_dasboard.png" alt="PolicyPilot Central Dashboard" width="100%"/>
</p>

> **Central Knowledge Base**: Features real-time Qdrant Cloud vector status, SHA-256 deduplication, active anti-hallucination threshold monitoring (0.58), multi-format file ingestion (PDF, DOCX, XLSX, CSV, PPTX, HTML), and one-click query suggestions.

---

### 2. Multi-Document Grounded Q&A with Live Citations
**Image Source**: [`./docs/assets/response_screen.jpg`](./docs/assets/response_screen.jpg)

<p align="center">
  <img src="./docs/assets/response_screen.jpg" alt="Policy Comparison and Citation Matrix" width="100%"/>
</p>

> **Transparent Grounding & Cross-Comparison**: Grounded synthesis comparing enterprise security and hospitality operational policies. Every assertion cites exact document pages (`[1]`, `[2]`, `[3]`), accompanied by an expandable 4-chunk retrieval audit trail (`Score: 0.6900`), copy answers, and dedicated table-level PDF download.

---

### 3. Boardroom-Ready Executive PDF Compliance Report
**Image Source**: [`./docs/assets/pdf_export.jpg`](./docs/assets/pdf_export.jpg)

<p align="center">
  <img src="./docs/assets/pdf_export.jpg" alt="Executive PDF Compliance Report" width="85%"/>
</p>

> **High-Fidelity PDF Compliance Export**: Single-click boardroom-ready report featuring Deep Slate & Emerald corporate branding, dynamic Purpose & Scope verification headers, auto-wrapped data tables, and zero raw markdown artifacts.

---

## 🏗️ System Architecture

![System Architecture](docs/assets/system_architecture.png)

```mermaid
flowchart TD
    subgraph Client ["Client Layer - Vercel / Cloudflare Pages"]
        UI["React + Vite Frontend<br/>Instant CDN Load"]
        INSP["Retrieved-Chunk Inspector & Citations"]
    end

    subgraph Gateway ["API Gateway - Render Free Service"]
        API["FastAPI Router"]
        SEC["Pydantic v2 Validation & Rate Limiter"]
        DEDUP["SHA-256 File Deduplication"]
    end

    subgraph Ingestion ["Ingestion & Tabular Pipeline"]
        EXT["Format-Specific Extractors<br/>PDF, DOCX, PPTX, HTML"]
        TBL["Table Extractor<br/>CSV & Multi-Sheet Excel openpyxl"]
        CHK["Header-Preserving Markdown Chunker"]
    end

    subgraph Retrieval ["Retrieval & Grounding Engine"]
        RET["Top-k Hybrid Vector Retrieval"]
        DET["🛡️ Gate 1: Deterministic Refusal Threshold<br/>Score < 0.58 = 0 Token Refusal"]
        VAL["🛡️ Gate 3: Citation Cross-Validator"]
    end

    subgraph CloudServices ["Free Cloud Infrastructure"]
        QD[("Qdrant Cloud Free<br/>Vector + Text Payload Storage")]
        GEM_EMB["Google gemini-embedding-001<br/>768-dim Embeddings"]
        GEM_LLM["Gemini 3.1 Flash Lite<br/>🛡️ Gate 2: Strict Grounding Contract"]
    end

    UI -->|REST API| API
    API --> SEC
    SEC --> DEDUP
    DEDUP --> EXT
    DEDUP --> TBL
    EXT --> CHK
    TBL --> CHK
    CHK -->|Batch Embed| GEM_EMB
    GEM_EMB -->|Vector + Payload| QD

    UI -->|POST /api/ask| RET
    RET -->|Query Vector| GEM_EMB
    RET -->|Cosine Similarity| QD
    QD -->|Top-k Chunks & Scores| DET
    DET -->|Score >= 0.58| GEM_LLM
    DET -->|Score < 0.58| VAL
    GEM_LLM --> VAL
    VAL -->|Structured Answer + Verified Citations| INSP
```

---

## 🔄 End-to-End Implementation Workflow

![Ingestion & Grounded Query Workflow](docs/assets/ingestion_query_workflow.png)

```mermaid
flowchart TD
    Start([User Uploads Document]) --> Hash["Calculate SHA-256 & Validate Format/Size"]
    Hash -->|Duplicate Found| FastReUse["Reuse Existing Qdrant Vectors (0 Tokens)"]
    Hash -->|Valid & New| Extract{"Detect File Type"}

    Extract -->|PDF / DOCX / PPTX / HTML| TextExt["Extract with Page/Section Metadata"]
    Extract -->|CSV / Multi-Sheet XLSX| TableExt["Stream Rows & Prepend Headers via openpyxl"]

    TextExt --> Chunk["Sliding Window Text Chunker"]
    TableExt --> TableChunk["Header-Preserving Markdown Chunker<br/>+ Workbook Overview Summary"]

    Chunk --> EmbedBatch["Batch Embed via gemini-embedding-001 (768-dim)"]
    TableChunk --> EmbedBatch
    EmbedBatch --> UpsertQdrant[("Upsert to Qdrant Cloud with Full Text Payload")]

    UpsertQdrant --> Ready([Document Ready for Querying])

    UserQuery([User Asks Policy Question]) --> EmbedQuery["Embed Query via gemini-embedding-001"]
    EmbedQuery --> VectorSearch[("Qdrant Top-k Cosine Search")]
    VectorSearch --> Gate1{"🛡️ Gate 1 Guardrail:<br/>Max Cosine Score >= 0.58?"}

    Gate1 -->|No| QuickRefuse["Deterministic Refusal (0 Tokens Spent)<br/>'Information not found in documents'"]
    Gate1 -->|Yes| Gate2["🛡️ Gate 2 Guardrail:<br/>Build Grounded Prompt Envelope<br/>with Passages #91;1#93;, #91;2#93;"]
    
    Gate2 --> GeminiCall["Gemini 3.1 Flash Lite Generation"]
    GeminiCall --> Gate3{"🛡️ Gate 3 Guardrail:<br/>Validate Citation Tags #91;X#93;<br/>against Retrieved Chunks"}

    Gate3 -->|Fabricated Tags| StripInvalid["Filter & Strip Invalid Citation Tags"]
    Gate3 -->|Verified Citations| FormatResponse["Format Grounded Answer + Citations"]
    StripInvalid --> FormatResponse

    QuickRefuse --> UIResponse([Deliver to Multi-Turn React UI with Audit Inspector])
    FormatResponse --> UIResponse
```

---

## 🛡️ Anti-Hallucination & Grounding Design

![Anti-Hallucination 3-Layer Firewall](docs/assets/anti_hallucination_firewall.png)

To prevent hallucinations, PolicyPilot applies a 3-layer verification firewall:

1. **🛡️ Gate 1: Pre-LLM Deterministic Refusal**:
   If the maximum cosine similarity score among retrieved chunks is below `0.58`, the system **does not call the LLM**. It immediately returns:
   > *"The provided documents do not contain sufficient information to answer this question."*  
   *Result: 100% reduction in hallucinated guesses on out-of-domain questions and 0 LLM tokens wasted.*

2. **🛡️ Gate 2: In-LLM Strict Grounding Contract**:
   ```text
   You are PolicyPilot, an enterprise public policy assistant.
   Answer the question ONLY using the factual context provided below.
   - Every claim must cite its source using bracketed numbers, e.g., [1] or [2].
   - If the context does not explicitly state the answer, state what is specified and clarify missing details.
   - Do NOT extrapolate, speculate, or incorporate external knowledge.
   ```

3. **🛡️ Gate 3: Post-LLM Citation Cross-Validation**:
   The backend scans the generated response for citation tags `[i]`. It programmatically verifies that index `i` maps to a chunk actually provided in the context. Any hallucinated citation reference is stripped or flagged before reaching the UI.

### 🛡️ Guardrail Code Implementation Matrix

| Guardrail Layer | Purpose | Exact Code Location | Key Function / Variable |
|---|---|---|---|
| **Gate 1: Pre-LLM Guardrail** | Instant refusal for queries with cosine score < 0.58 (0 LLM tokens spent) | `backend/app/services/guardrails.py`<br/>`backend/app/services/generation.py` | `is_refusal_required(chunks, threshold=0.58)` |
| **Gate 2: In-LLM Grounding** | Strictly enforces answer extraction solely from retrieved passages | `backend/app/services/generation.py` | `SYSTEM_INSTRUCTION`<br/>`build_context_envelope()` |
| **Gate 3: Citation Validator** | Validates `[1]`, `[2]` tags against real chunks; strips fabricated references | `backend/app/services/guardrails.py` | `validate_and_clean_citations()` |
| **Gate 4: Storage Quota Guard** | SHA-256 deduplication (0 tokens on re-upload) & LRU eviction for Qdrant | `backend/app/services/vector_store.py`<br/>`backend/app/ingestion/validation.py` | `find_document_by_hash()`<br/>`check_and_evict_lru()` |

---

## 📁 Dedicated Professional Folder Structure

```text
PolicyPilot-RAG/
├── backend/                     # Dedicated Python FastAPI service
│   ├── app/
│   │   ├── main.py              # FastAPI entry point, CORS, rate limiting
│   │   ├── config.py            # Pydantic environment configuration
│   │   ├── schemas.py           # Pydantic v2 request/response models
│   │   ├── api/                 # API route controllers
│   │   ├── ingestion/           # Format extractors & table chunkers
│   │   └── services/            # Embeddings, vector store, generation, guardrails
│   ├── requirements.txt         # Lightweight dependencies (<120MB RAM)
│   └── .env.example             # Backend environment template
├── frontend/                    # Standalone React + Vite user interface
│   ├── src/                     # React application source code
│   └── package.json             # Frontend dependencies & scripts
├── docs/                        # Complete project documentation & visual charts
│   ├── PROJECT_BLUEPRINT.md     # Full architectural specification with embedded visual charts
│   ├── TASK_CHECKLIST.md        # Living milestone verification gates
│   └── assets/                  # High-resolution visual screenshots & SVG diagrams
│       ├── main_dasboard.png    # Live Central Knowledge Base & Dashboard UI
│       ├── response_screen.jpg  # Grounded Q&A with live citations & audit trail
│       ├── pdf_export.jpg       # Executive boardroom-ready PDF compliance export
│       ├── system_architecture.png
│       ├── ingestion_query_workflow.png
│       └── anti_hallucination_firewall.png
├── tests/                       # Automated testing & QA suite
│   └── test_ingestion.py        # Ingestion tests
├── evals/                       # Evaluation harness & golden benchmark
│   ├── golden_set.jsonl         # 25 curated policy test cases
│   ├── metrics.py               # Hit@k, MRR, Faithfulness formulas
│   └── run_eval.py              # Throttled evaluation runner (15 RPM safe)
├── data/                        # Demonstration & test documents
│   └── sample_policies/         # Public PDF, DOCX, CSV, and XLSX files
├── pytest.ini                   # Pytest configuration with pythonpath = backend
└── README.md                    # Project documentation & visual guides
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Set Up Virtual Environment
```bash
git clone https://github.com/your-username/PolicyPilot-RAG.git
cd PolicyPilot-RAG
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your free API keys:
```bash
cp .env.example .env
```
* **Gemini API Key**: Free at [Google AI Studio](https://aistudio.google.com/).
* **Qdrant URL & Key**: Free 1GB cluster at [Qdrant Cloud](https://cloud.qdrant.io/).

### 3. Run Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation will be available at: `http://localhost:8000/docs`.

### 4. Run Frontend User Interface
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

To produce a production build:
```bash
npm run build --prefix frontend
```

### 5. Running Automated Tests

PolicyPilot features a clean test suite partitioned into fast offline unit tests and live cloud integration tests:

```bash
# A. Fast Offline Unit Tests (<2 seconds, zero network required):
pytest -m "not integration" -v

# B. Live Cloud Integration Tests (Validates live Qdrant Cloud & Google Gemini AI Studio):
pytest -m "integration" -v

# C. Run Complete Test Suite (17/17 tests passing):
pytest -v
```

> [!TIP]
> **Why do live tests take longer (~20s)?**
> The integration tests communicate with live Google Gemini AI Studio APIs (generating 768-dim embeddings and LLM reasoning) and live Qdrant Cloud clusters across HTTPS. To ensure resilience and avoid hitting Google AI Studio's 15 RPM free-tier rate limits, requests include retry backoffs and throttled pacing. The offline unit suite (`pytest -m "not integration"`) runs completely locally in under 2 seconds.

---

## 🌐 100% Free ($0/Month) Cloud Deployment

PolicyPilot RAG is engineered from the ground up to run permanently on free-tier cloud infrastructure with **zero credit card required** and **$0 monthly cloud spend**:

* **Detailed Deployment Guide**: See [docs/FREE_DEPLOYMENT_GUIDE.md](docs/FREE_DEPLOYMENT_GUIDE.md) for full click-by-click instructions.
* **Frontend CDN**: Deployed to **Vercel** or **Cloudflare Pages** using `frontend/vercel.json` (global edge CDN, auto-SSL, instant builds).
* **Backend Web Service**: Deployed to **Render** via `render.yaml` or **Hugging Face Spaces** using the multi-stage `Dockerfile` (<120MB RAM, single worker).
* **Vector Database**: Hosted on **Qdrant Cloud Free Tier** (1GB RAM, 4GB SSD, free forever).
* **Cold-Start Elimination**: Continuous keep-alive ping via **UptimeRobot** querying `/health` every 14 minutes.

---

## 🚦 Current Progress & Milestone Verification

| Milestone | Status | Description |
|---|---|---|
| **Phase 0: Scaffolding** | ✅ Completed | Blueprint, checklist, requirements, and virtualenv setup |
| **Move 1: Ingestion & Tabular Parsers** | ✅ Completed | PDF, DOCX, CSV, and multi-sheet `.xlsx` chunkers passing 5/5 unit tests |
| **Move 2: Embeddings & Qdrant** | ✅ Completed | Google GenAI 768-dim embeddings & live Qdrant Cloud cluster integration (3/3 passed) |
| **Move 3: Retrieval & Grounding** | ✅ Completed | Strict citation cross-validator & deterministic refusal (3/3 passed) |
| **Move 4: Golden Evaluation** | ✅ Completed | 25-question golden benchmark: Hit@3: 100%, MRR: 1.0, Refusal Accuracy: 100% |
| **Move 5: FastAPI REST APIs** | ✅ Completed | Upload, list, delete, ask, and health endpoints (3/3 passed) |
| **Move 6: React Frontend & Dual Theme** | ✅ Completed | Dark & high-contrast Normal mode, cold-start status probe & render.yaml |
| **Move 7: Data Intelligence & PDF Export** | ✅ Completed | Interactive CSV grid/raw view and executive branded PDF report generation |
| **Move 8: Conversational Multilingual** | ✅ Completed | History-aware translations/reformulations (Urdu, Roman Urdu, English) with zero false refusals |

**Current Status**: All milestones completed and verified! Total test suite: **17/17 tests passing (100%)**. Production build verified and ready for deployment.
