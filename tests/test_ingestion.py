"""Tests for document validation, extraction, and chunking (Move 1)."""
import io
import csv
import pytest
import pymupdf
from docx import Document
from openpyxl import Workbook

from app.ingestion.validation import validate_file, compute_file_hash
from app.ingestion.chunking import chunk_document


def test_file_validation_and_hash():
    """Verify file size, format checks, and SHA-256 calculation."""
    content = b"Sample policy text"
    is_valid, err = validate_file("policy.pdf", content)
    assert is_valid is True
    assert err == ""

    # Test empty file
    is_valid, err = validate_file("empty.pdf", b"")
    assert is_valid is False
    assert "empty" in err.lower()

    # Test unsupported extension
    is_valid, err = validate_file("policy.exe", content)
    assert is_valid is False
    assert "unsupported" in err.lower()

    # Test hash reproducibility
    hash1 = compute_file_hash(content)
    hash2 = compute_file_hash(content)
    assert hash1 == hash2
    assert len(hash1) == 64


def test_pdf_extraction_and_chunking():
    """Create an in-memory PDF and verify page metadata is retained in chunks."""
    doc = pymupdf.open()
    page1 = doc.new_page()
    page1.insert_text((50, 50), "Policy Section 1: Travel reimbursement limit is $500.")
    page2 = doc.new_page()
    page2.insert_text((50, 50), "Policy Section 2: Meal allowance per day is $60.")
    pdf_bytes = doc.tobytes()
    doc.close()

    chunks = chunk_document("travel_policy.pdf", pdf_bytes, doc_id="doc1")
    assert len(chunks) >= 3  # 1 overview chunk + 2 page chunks
    assert chunks[0]["doc_id"] == "doc1"
    assert chunks[0]["page_or_section"] == "Document Overview"
    assert "Page 1" in chunks[1]["page_or_section"]
    assert "Travel reimbursement" in chunks[1]["text"]
    assert "Page 2" in chunks[2]["page_or_section"]
    assert "Meal allowance" in chunks[2]["text"]


def test_docx_extraction_and_chunking():
    """Create an in-memory Word document with headings and check section extraction."""
    doc = Document()
    doc.add_heading("Leave Policy", level=1)
    doc.add_paragraph("Employees receive 20 days of paid vacation annually.")
    docx_io = io.BytesIO()
    doc.save(docx_io)
    docx_bytes = docx_io.getvalue()

    chunks = chunk_document("handbook.docx", docx_bytes, doc_id="doc2")
    assert len(chunks) >= 1
    assert "Section: Leave Policy" in chunks[0]["page_or_section"]
    assert "20 days" in chunks[0]["text"]


def test_csv_table_chunking():
    """Test CSV ingestion and header-preserving Markdown table formatting."""
    csv_io = io.StringIO()
    writer = csv.writer(csv_io)
    writer.writerow(["City", "Tier", "Max_Per_Diem"])
    writer.writerow(["New York", "Tier 1", "75"])
    writer.writerow(["Chicago", "Tier 2", "60"])
    csv_bytes = csv_io.getvalue().encode("utf-8")

    chunks = chunk_document("per_diem.csv", csv_bytes, doc_id="doc3")
    # Should have 1 summary chunk + 1 table chunk
    assert len(chunks) == 2
    # Check summary chunk
    assert chunks[0]["sheet_name"] == "All Sheets Summary"
    # Check table chunk
    assert "City" in chunks[1]["text"]
    assert "New York" in chunks[1]["text"]
    assert "| --- |" in chunks[1]["text"]  # Markdown table separator


def test_excel_multi_sheet_chunking():
    """Test multi-sheet Excel parsing with openpyxl and sheet-level metadata."""
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "Domestic_Rates"
    ws1.append(["State", "Daily_Rate"])
    ws1.append(["California", "$120"])

    ws2 = wb.create_sheet(title="International_Rates")
    ws2.append(["Country", "Daily_Rate"])
    ws2.append(["United Kingdom", "$150"])

    excel_io = io.BytesIO()
    wb.save(excel_io)
    excel_bytes = excel_io.getvalue()

    chunks = chunk_document("rates.xlsx", excel_bytes, doc_id="doc4")
    assert len(chunks) >= 3  # 1 summary + at least 1 chunk per sheet

    # Verify summary chunk mentions both sheets
    assert "Domestic_Rates" in chunks[0]["text"]
    assert "International_Rates" in chunks[0]["text"]

    # Verify sheet 1 chunk has Domestic_Rates metadata
    assert chunks[1]["sheet_name"] == "Domestic_Rates"
    assert "California" in chunks[1]["text"]

    # Verify sheet 2 chunk has International_Rates metadata
    assert chunks[2]["sheet_name"] == "International_Rates"
    assert "United Kingdom" in chunks[2]["text"]
