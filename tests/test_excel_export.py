"""Unit tests for the openpyxl branded Excel export service."""
import pytest
import openpyxl
from app.services.excel_export import build_branded_workbook, export_to_excel_bytes, clean_markdown_artifacts


def test_clean_markdown_artifacts():
    assert clean_markdown_artifacts("**Staff Management**") == "Staff Management"
    assert clean_markdown_artifacts("*Italic Text*") == "Italic Text"
    assert clean_markdown_artifacts("`inline_code()`") == "inline_code()"
    assert clean_markdown_artifacts("*") == ""
    assert clean_markdown_artifacts("---") == ""


def test_build_branded_workbook():
    sample_rows = [
        ["CATEGORY", "KEY PROVISIONS", "SOURCE"],
        ["**Operations**", "Daily kitchen protocols.", "[1]"],
        ["**Service**", "Front-of-house table etiquette.", "[2]"],
        ["*", "", ""]  # artifact row to be cleaned
    ]
    citations = [
        {"citation_id": "[1]", "filename": "policy.pdf", "page_or_section": "Page 1", "snippet": "Sample text snippet."}
    ]

    wb = build_branded_workbook(
        rows=sample_rows,
        scope_name="Company Handbooks",
        question="What are the operational guidelines?",
        citations=citations
    )

    assert "Policy Intelligence Report" in wb.sheetnames
    assert "Source Citations" in wb.sheetnames

    ws1 = wb["Policy Intelligence Report"]
    assert ws1["A1"].value == "PolicyPilot RAG"
    # Header row should have clean uppercase text
    assert ws1["A10"].value == "CATEGORY"
    assert ws1["B10"].value == "KEY PROVISIONS"
    # Data row should have stripped asterisks
    assert ws1["A11"].value == "Operations"

    # Tab 2 checks
    ws2 = wb["Source Citations"]
    assert ws2["A4"].value == "CITATION ID"
    assert ws2["A5"].value == "[1]"
    assert ws2["B5"].value == "policy.pdf"

    # Bytes generation check
    excel_bytes = export_to_excel_bytes(sample_rows, citations=citations)
    assert len(excel_bytes) > 2000
    assert excel_bytes.startswith(b"PK")  # Standard ZIP / XLSX magic bytes
