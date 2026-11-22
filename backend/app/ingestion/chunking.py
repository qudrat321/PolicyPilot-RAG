"""Splits text and tables into chunks with metadata to prevent hallucinations."""
import uuid
from typing import List, Dict, Any

DEFAULT_CHUNK_SIZE = 500  # Character count per chunk
DEFAULT_CHUNK_OVERLAP = 100  # Overlap between consecutive chunks
TABLE_ROWS_PER_CHUNK = 8  # Number of spreadsheet rows grouped into each markdown chunk


def chunk_text_content(
    text: str,
    doc_id: str,
    filename: str,
    page_or_section: str,
    page_num: int = None,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    start_idx: int = 0,
) -> List[Dict[str, Any]]:
    """Divide long text into smaller pieces while keeping small overlaps and exact page sources."""
    chunks = []
    start = 0
    text_len = len(text)
    chunk_idx = start_idx

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk_slice = text[start:end].strip()

        if chunk_slice:
            chunks.append({
                "chunk_id": f"{doc_id}_{chunk_idx:03d}",
                "doc_id": doc_id,
                "filename": filename,
                "chunk_index": chunk_idx,
                "text": chunk_slice,
                "page_or_section": page_or_section,
                "page_num": page_num,
                "sheet_name": None,
                "row_range": None,
                "is_table": False,
            })
            chunk_idx += 1

        if end == text_len:
            break
        start += (chunk_size - chunk_overlap)

    return chunks


def build_markdown_table(header: List[str], rows: List[List[str]]) -> str:
    """Format rows and header into a clean Markdown table."""
    col_count = len(header)
    clean_header = [h if h else f"Col_{i+1}" for i, h in enumerate(header)]
    header_line = "| " + " | ".join(clean_header) + " |"
    separator_line = "| " + " | ".join(["---"] * col_count) + " |"

    row_lines = []
    for r in rows:
        padded = r + [""] * (col_count - len(r))
        row_lines.append("| " + " | ".join(padded[:col_count]) + " |")

    return "\n".join([header_line, separator_line] + row_lines)


def chunk_tabular_content(
    table_data: List[Dict[str, Any]],
    doc_id: str,
    filename: str,
) -> List[Dict[str, Any]]:
    """Convert spreadsheets into markdown chunks with repeated headers and a summary chunk."""
    chunks = []
    chunk_idx = 0

    # 1. Create a high-level overview chunk describing all sheets in the file
    summary_lines = [f"Spreadsheet Document: {filename}", f"Total Sheets: {len(table_data)}"]
    for s in table_data:
        cols = ", ".join(str(c) for c in s["header"][:6])
        summary_lines.append(f"- Sheet '{s['sheet_name']}': {s['row_count']} rows. Columns: [{cols}]")

    chunks.append({
        "chunk_id": f"{doc_id}_{chunk_idx:03d}",
        "doc_id": doc_id,
        "filename": filename,
        "chunk_index": chunk_idx,
        "text": "\n".join(summary_lines),
        "page_or_section": "Spreadsheet Overview",
        "page_num": None,
        "sheet_name": "All Sheets Summary",
        "row_range": "Summary",
        "is_table": True,
    })
    chunk_idx += 1

    # 2. Chunk rows per sheet with repeated headers
    for s in table_data:
        sheet_name = s["sheet_name"]
        header = s["header"]
        rows = s["rows"]

        for r_start in range(0, len(rows), TABLE_ROWS_PER_CHUNK):
            r_end = min(r_start + TABLE_ROWS_PER_CHUNK, len(rows))
            row_slice = rows[r_start:r_end]

            table_md = build_markdown_table(header, row_slice)
            contextual_text = f"Document: {filename} | Sheet: {sheet_name} | Rows: {r_start + 1}-{r_end}\n{table_md}"

            chunks.append({
                "chunk_id": f"{doc_id}_{chunk_idx:03d}",
                "doc_id": doc_id,
                "filename": filename,
                "chunk_index": chunk_idx,
                "text": contextual_text,
                "page_or_section": f"Sheet: {sheet_name} (Rows {r_start + 1}-{r_end})",
                "page_num": None,
                "sheet_name": sheet_name,
                "row_range": f"{r_start + 1}-{r_end}",
                "is_table": True,
            })
            chunk_idx += 1

    return chunks


def chunk_document(
    filename: str,
    content: bytes,
    doc_id: str = None,
) -> List[Dict[str, Any]]:
    """Master entry point to extract and chunk any supported document or spreadsheet."""
    if not doc_id:
        doc_id = str(uuid.uuid4())[:8]

    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in [".csv", ".xlsx"]:
        from app.ingestion.table_extractors import extract_tables_from_file
        tables = extract_tables_from_file(filename, content)
        return chunk_tabular_content(tables, doc_id, filename)
    else:
        from app.ingestion.extractors import extract_text_from_file
        sections = extract_text_from_file(filename, content)
        all_chunks = []

        # Create an overarching Document Overview chunk for multi-page/section files
        if len(sections) > 1:
            overview_lines = [
                f"Document Overview: {filename}",
                f"Total Pages/Sections: {len(sections)}",
                "Table of Contents & Core Topics:",
            ]
            for s in sections[:10]:
                preview = s["text"].replace("\n", " ").strip()[:90]
                overview_lines.append(f"- {s['page_or_section']}: {preview}...")

            all_chunks.append({
                "chunk_id": f"{doc_id}_000",
                "doc_id": doc_id,
                "filename": filename,
                "chunk_index": 0,
                "text": "\n".join(overview_lines),
                "page_or_section": "Document Overview",
                "page_num": None,
                "sheet_name": None,
                "row_range": "Overview",
                "is_table": False,
            })

        for sec in sections:
            sec_chunks = chunk_text_content(
                text=sec["text"],
                doc_id=doc_id,
                filename=filename,
                page_or_section=sec["page_or_section"],
                page_num=sec.get("page_num"),
                start_idx=len(all_chunks),
            )
            all_chunks.extend(sec_chunks)
        return all_chunks
