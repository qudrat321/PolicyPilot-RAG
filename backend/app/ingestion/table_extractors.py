"""Extracts data from CSV and multi-sheet Excel files using memory-efficient streaming."""
import csv
import io
from typing import List, Dict, Any
from openpyxl import load_workbook

MAX_ROWS_PER_SHEET = 300  # Cap rows for zero-cost demo performance
MAX_SHEETS_PER_FILE = 10  # Cap sheets to prevent cluster memory overload


def extract_csv(content: bytes) -> List[Dict[str, Any]]:
    """Read a CSV file and return rows with the header attached."""
    decoded = content.decode("utf-8", errors="replace")
    reader = list(csv.reader(io.StringIO(decoded)))
    if not reader:
        return []

    header = [col.strip() for col in reader[0] if col.strip()]
    rows = reader[1:MAX_ROWS_PER_SHEET + 1]

    return [{
        "sheet_name": "CSV_Data",
        "header": header,
        "rows": rows,
        "row_count": len(rows),
    }]


def extract_excel_sheets(content: bytes) -> List[Dict[str, Any]]:
    """Stream rows from each sheet of an Excel file without loading entire file into memory."""
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    all_sheets = []

    for sheet_name in wb.sheetnames[:MAX_SHEETS_PER_FILE]:
        ws = wb[sheet_name]
        raw_rows = []
        for row in ws.iter_rows(values_only=True):
            if any(cell is not None for cell in row):
                cleaned_row = [str(cell).strip() if cell is not None else "" for cell in row]
                raw_rows.append(cleaned_row)
            if len(raw_rows) >= MAX_ROWS_PER_SHEET + 1:
                break

        if not raw_rows:
            continue

        header = raw_rows[0]
        data_rows = raw_rows[1:]
        all_sheets.append({
            "sheet_name": sheet_name,
            "header": header,
            "rows": data_rows,
            "row_count": len(data_rows),
        })

    wb.close()
    return all_sheets


def extract_tables_from_file(filename: str, content: bytes) -> List[Dict[str, Any]]:
    """Routes CSV or Excel files to table extractors."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == ".csv":
        return extract_csv(content)
    elif ext == ".xlsx":
        return extract_excel_sheets(content)
    return []
