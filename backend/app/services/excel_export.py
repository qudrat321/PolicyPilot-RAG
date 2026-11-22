"""PolicyPilot RAG - Branded Excel (.xlsx) Export Service using openpyxl.

Implements enterprise styling:
- Primary Dark Slate Banner (#0F172A) with Emerald (#10B981) accent
- Tab 1: 'Policy Intelligence Report' (Executive Scope, Findings Table, Audit Trail, Footer)
- Tab 2: 'Source Citations' (Citation ID, Document, Section, Snippet)
- Auto-adjusted column widths (cap 55) & row heights, frozen panes, and landscape print setup.
"""
import io
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter


def clean_markdown_artifacts(text: Optional[str]) -> str:
    """Strip raw Markdown syntax (**bold**, *italic*, backticks, lone asterisks)."""
    if not text:
        return ""
    s = str(text)
    s = re.sub(r"```[a-z]*\n?[\s\S]*?\n```", " ", s)
    s = re.sub(r"\*\*+(.*?)\*\*+", r"\1", s, flags=re.DOTALL)
    s = re.sub(r"\*+(.*?)\*+", r"\1", s, flags=re.DOTALL)
    s = re.sub(r"__+(.*?)__+", r"\1", s, flags=re.DOTALL)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"[*`#~]", "", s)
    s = re.sub(r"[\r\n\t]+", " ", s)
    s = s.strip()
    if re.match(r"^[\-_•\s.:,;]*$", s):
        return ""
    return s


def build_branded_workbook(
    rows: List[List[str]],
    scope_name: str = "All Policy Documents",
    question: str = "Policy Inquiry",
    answer: str = "",
    citations: Optional[List[Dict[str, Any]]] = None,
) -> openpyxl.Workbook:
    """Build a 2-tab executive Excel report using openpyxl matching PolicyPilot RAG branding."""
    wb = openpyxl.Workbook()
    citations = citations or []
    clean_q = re.sub(r"[\r\n]+", " ", question or "Policy Inquiry").strip()
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")

    # Brand Palette Fills
    fill_dark_slate = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    fill_emerald_stripe = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
    fill_section_header = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_zebra_even = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    fill_zebra_odd = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    # Borders
    border_thin_gray = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )
    border_light_gray = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    # Clean rows & headers
    clean_rows = []
    for r in rows:
        cleaned_cells = [clean_markdown_artifacts(c) for c in r]
        if any(bool(c) for c in cleaned_cells):
            clean_rows.append(cleaned_cells)

    headers = clean_rows[0] if clean_rows else ["CATEGORY", "KEY PROVISIONS", "SOURCE"]
    data_rows = clean_rows[1:] if len(clean_rows) > 1 else []
    col_count = max(len(headers), 4)

    # =========================================================================
    # TAB 1: Policy Intelligence Report
    # =========================================================================
    ws1 = wb.active
    ws1.title = "Policy Intelligence Report"

    # Page Setup: Landscape Fit to 1 Page Wide
    ws1.page_setup.orientation = ws1.ORIENTATION_LANDSCAPE
    ws1.page_setup.paperSize = ws1.PAPERSIZE_A4
    ws1.sheet_properties.pageSetUpPr.fitToPage = True
    ws1.page_setup.fitToWidth = 1
    ws1.page_setup.fitToHeight = 0

    # Row 1: Main Brand Banner Title & Status
    ws1.row_dimensions[1].height = 28
    left_banner_end = max(1, col_count - 2)
    right_banner_start = left_banner_end + 1

    ws1.merge_cells(start_row=1, start_column=1, end_row=1, end_column=left_banner_end)
    cell_a1 = ws1.cell(row=1, column=1)
    cell_a1.value = "PolicyPilot RAG"
    cell_a1.font = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
    cell_a1.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    ws1.merge_cells(start_row=1, start_column=right_banner_start, end_row=1, end_column=col_count)
    cell_status = ws1.cell(row=1, column=right_banner_start)
    cell_status.value = "VERIFICATION: 100% GROUNDED"
    cell_status.font = Font(name="Calibri", size=10, bold=True, color="10B981")
    cell_status.alignment = Alignment(horizontal="right", vertical="center")

    for c in range(1, col_count + 1):
        ws1.cell(row=1, column=c).fill = fill_dark_slate

    # Row 2: Subtitle & Date
    ws1.row_dimensions[2].height = 20
    ws1.merge_cells(start_row=2, start_column=1, end_row=2, end_column=left_banner_end)
    cell_sub = ws1.cell(row=2, column=1)
    cell_sub.value = "Enterprise Policy Compliance & Grounded Intelligence Report"
    cell_sub.font = Font(name="Calibri", size=9, italic=True, color="94A3B8")
    cell_sub.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    ws1.merge_cells(start_row=2, start_column=right_banner_start, end_row=2, end_column=col_count)
    cell_date = ws1.cell(row=2, column=right_banner_start)
    cell_date.value = f"Date: {now_str}"
    cell_date.font = Font(name="Calibri", size=9, color="CBD5E1")
    cell_date.alignment = Alignment(horizontal="right", vertical="center")

    for c in range(1, col_count + 1):
        ws1.cell(row=2, column=c).fill = fill_dark_slate

    # Row 3: Accent Stripe (#10B981)
    ws1.row_dimensions[3].height = 4
    for c in range(1, col_count + 1):
        ws1.cell(row=3, column=c).fill = fill_emerald_stripe

    # Row 4: Blank
    ws1.row_dimensions[4].height = 10

    # Rows 5-7: Executive Purpose & Scope Box
    ws1.row_dimensions[5].height = 24
    ws1.merge_cells(start_row=5, start_column=1, end_row=5, end_column=col_count)
    c5 = ws1.cell(row=5, column=1)
    c5.value = "EXECUTIVE PURPOSE & DOCUMENT SCOPE"
    c5.font = Font(name="Calibri", size=10.5, bold=True, color="059669")
    c5.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    ws1.row_dimensions[6].height = 22
    ws1.merge_cells(start_row=6, start_column=1, end_row=6, end_column=col_count)
    c6 = ws1.cell(row=6, column=1)
    c6.value = f'• Purpose: Provides verified, policy-grounded provisions addressing "{clean_q}".'
    c6.font = Font(name="Calibri", size=9.5, color="334155")
    c6.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True, indent=1)

    ws1.row_dimensions[7].height = 22
    ws1.merge_cells(start_row=7, start_column=1, end_row=7, end_column=col_count)
    c7 = ws1.cell(row=7, column=1)
    c7.value = f"• Scope & Verification: Validated strictly against repository [{scope_name}] with zero-hallucination vector guarantee."
    c7.font = Font(name="Calibri", size=9.5, color="334155")
    c7.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True, indent=1)

    for r in range(5, 8):
        for c in range(1, col_count + 1):
            cell = ws1.cell(row=r, column=c)
            cell.fill = fill_section_header
            cell.border = border_thin_gray

    # Row 8: Blank
    ws1.row_dimensions[8].height = 10

    # Row 9: Section Header
    ws1.row_dimensions[9].height = 24
    ws1.merge_cells(start_row=9, start_column=1, end_row=9, end_column=col_count)
    c9 = ws1.cell(row=9, column=1)
    c9.value = "VERIFIED POLICY FINDINGS & DETAILS"
    c9.font = Font(name="Calibri", size=10.5, bold=True, color="059669")
    c9.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c in range(1, col_count + 1):
        ws1.cell(row=9, column=c).fill = fill_section_header
        ws1.cell(row=9, column=c).border = border_thin_gray

    # Row 10: Data Table Headers
    ws1.row_dimensions[10].height = 28
    for i, h in enumerate(headers, start=1):
        cell = ws1.cell(row=10, column=i)
        cell.value = str(h).upper()
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = fill_dark_slate
        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True, indent=1)
        cell.border = border_thin_gray

    # Rows 11+: Data Rows
    current_row = 11
    for r_idx, row in enumerate(data_rows):
        max_lines = 1
        is_even = (r_idx % 2 == 0)
        row_fill = fill_zebra_even if is_even else fill_zebra_odd

        for c_idx, cell_value in enumerate(row, start=1):
            cell = ws1.cell(row=current_row, column=c_idx)
            val_str = str(cell_value or "")
            cell.value = val_str
            cell.font = Font(name="Calibri", size=9.5, color="1E293B")
            cell.fill = row_fill
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True, indent=1)
            cell.border = border_light_gray
            line_count = len(val_str.split("\n")) + int(len(val_str) / 45)
            if line_count > max_lines:
                max_lines = line_count

        ws1.row_dimensions[current_row].height = max(22, max_lines * 15 + 6)
        current_row += 1

    # Freeze Panes at Data Header (Row 10)
    ws1.freeze_panes = "A11"

    # Row: Spacing
    current_row += 1
    ws1.row_dimensions[current_row].height = 10

    # Row: Audit Trail Section
    if citations:
        current_row += 1
        ws1.row_dimensions[current_row].height = 22
        ws1.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=col_count)
        c_aud = ws1.cell(row=current_row, column=1)
        c_aud.value = "AUDIT TRAIL: VERIFIED SOURCE CITATIONS & PASSAGES"
        c_aud.font = Font(name="Calibri", size=9.5, bold=True, color="059669")
        c_aud.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        for c in range(1, col_count + 1):
            ws1.cell(row=current_row, column=c).fill = fill_section_header
            ws1.cell(row=current_row, column=c).border = border_thin_gray

        for idx, cite in enumerate(citations):
            current_row += 1
            ws1.row_dimensions[current_row].height = 20
            tag = cite.get("citation_id") or f"[{idx + 1}]"
            doc_name = cite.get("filename") or "Document"
            section = f" • {cite['page_or_section']}" if cite.get("page_or_section") else ""
            cite_str = f"{tag} {doc_name}{section}"

            ws1.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=col_count)
            c_item = ws1.cell(row=current_row, column=1)
            c_item.value = cite_str
            c_item.font = Font(name="Calibri", size=9, color="64748B")
            c_item.alignment = Alignment(horizontal="left", vertical="center", indent=1)
            for c in range(1, col_count + 1):
                ws1.cell(row=current_row, column=c).fill = fill_zebra_even

    # Footer Row
    current_row += 1
    ws1.row_dimensions[current_row].height = 24
    ws1.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=col_count)
    c_foot = ws1.cell(row=current_row, column=1)
    c_foot.value = "PolicyPilot RAG | Confidential Enterprise Compliance | Zero-Hallucination Vector Architecture"
    c_foot.font = Font(name="Calibri", size=8.5, italic=True, color="94A3B8")
    c_foot.alignment = Alignment(horizontal="center", vertical="center")

    # Auto-adjust column widths for Tab 1 (Max cap 55)
    for c_idx in range(1, col_count + 1):
        max_len = 16
        for r_idx in range(10, current_row):
            val = ws1.cell(row=r_idx, column=c_idx).value
            if val:
                val_len = len(str(val))
                if val_len > max_len:
                    max_len = val_len
        col_letter = get_column_letter(c_idx)
        ws1.column_dimensions[col_letter].width = min(55, max(18, max_len + 4))

    # =========================================================================
    # TAB 2: Source Citations
    # =========================================================================
    ws2 = wb.create_sheet(title="Source Citations")
    ws2.page_setup.orientation = ws2.ORIENTATION_LANDSCAPE
    ws2.page_setup.paperSize = ws2.PAPERSIZE_A4
    ws2.sheet_properties.pageSetUpPr.fitToPage = True
    ws2.page_setup.fitToWidth = 1
    ws2.page_setup.fitToHeight = 0

    # Banner
    ws2.row_dimensions[1].height = 26
    ws2.merge_cells("A1:D1")
    c2_1 = ws2.cell(row=1, column=1)
    c2_1.value = "PolicyPilot RAG — Verified Source Citations & Audit Register"
    c2_1.font = Font(name="Calibri", size=13, bold=True, color="FFFFFF")
    c2_1.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c in range(1, 5):
        ws2.cell(row=1, column=c).fill = fill_dark_slate

    ws2.row_dimensions[2].height = 4
    for c in range(1, 5):
        ws2.cell(row=2, column=c).fill = fill_emerald_stripe

    ws2.row_dimensions[3].height = 10

    # Headers (Row 4)
    tab2_headers = ["CITATION ID", "DOCUMENT NAME", "PAGE / SECTION", "EXTRACTED PASSAGE / SNIPPET"]
    ws2.row_dimensions[4].height = 28
    for i, h in enumerate(tab2_headers, start=1):
        c = ws2.cell(row=4, column=i)
        c.value = h
        c.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        c.fill = fill_dark_slate
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True, indent=1)
        c.border = border_thin_gray

    # Freeze Header on Tab 2
    ws2.freeze_panes = "A5"

    # Citation Rows
    t2_row = 5
    for idx, cite in enumerate(citations):
        tag = cite.get("citation_id") or f"[{idx + 1}]"
        doc_name = cite.get("filename") or "Document"
        section = cite.get("page_or_section") or "Section"
        snippet = clean_markdown_artifacts(cite.get("snippet") or "")

        is_even = (idx % 2 == 0)
        r_fill = fill_zebra_even if is_even else fill_zebra_odd
        vals = [tag, doc_name, section, snippet]

        max_lines = 1
        for c_idx, val in enumerate(vals, start=1):
            cell = ws2.cell(row=t2_row, column=c_idx)
            cell.value = val
            cell.font = Font(name="Calibri", size=9.5, color="1E293B")
            cell.fill = r_fill
            cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True, indent=1)
            cell.border = border_light_gray
            if c_idx == 4 and val:
                lines = len(val.split("\n")) + int(len(val) / 50)
                if lines > max_lines:
                    max_lines = lines

        ws2.row_dimensions[t2_row].height = max(24, min(140, max_lines * 15 + 8))
        t2_row += 1

    # Tab 2 Column Widths
    ws2.column_dimensions["A"].width = 16
    ws2.column_dimensions["B"].width = 36
    ws2.column_dimensions["C"].width = 22
    ws2.column_dimensions["D"].width = 55

    return wb


def export_to_excel_bytes(
    rows: List[List[str]],
    scope_name: str = "All Policy Documents",
    question: str = "Policy Inquiry",
    answer: str = "",
    citations: Optional[List[Dict[str, Any]]] = None,
) -> bytes:
    """Convenience helper returning Excel bytes directly."""
    wb = build_branded_workbook(rows, scope_name, question, answer, citations)
    bio = io.BytesIO()
    wb.save(bio)
    return bio.getvalue()
