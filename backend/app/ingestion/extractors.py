"""Extracts text and page or section metadata from PDFs, Word, PPTX, and HTML files."""
import io
from typing import List, Dict, Any
from bs4 import BeautifulSoup
import pymupdf
from docx import Document
from pptx import Presentation


def extract_pdf(content: bytes) -> List[Dict[str, Any]]:
    """Extract text from each page of a PDF file, keeping the page number."""
    pages = []
    with pymupdf.open(stream=content, filetype="pdf") as doc:
        for page_idx, page in enumerate(doc):
            text = page.get_text().strip()
            if text:
                pages.append({
                    "text": text,
                    "page_or_section": f"Page {page_idx + 1}",
                    "page_num": page_idx + 1,
                    "sheet_name": None,
                })
    return pages


def extract_docx(content: bytes) -> List[Dict[str, Any]]:
    """Extract text from a Word document, keeping heading names as section metadata."""
    doc = Document(io.BytesIO(content))
    sections = []
    current_heading = "General"
    current_text = []

    for para in doc.paragraphs:
        line = para.text.strip()
        if not line:
            continue
        if para.style.name.startswith("Heading"):
            if current_text:
                sections.append({
                    "text": "\n".join(current_text),
                    "page_or_section": f"Section: {current_heading}",
                    "page_num": None,
                    "sheet_name": None,
                })
                current_text = []
            current_heading = line
        else:
            current_text.append(line)

    if current_text:
        sections.append({
            "text": "\n".join(current_text),
            "page_or_section": f"Section: {current_heading}",
            "page_num": None,
            "sheet_name": None,
        })
    return sections


def extract_pptx(content: bytes) -> List[Dict[str, Any]]:
    """Extract text from PowerPoint presentations, keeping slide numbers."""
    prs = Presentation(io.BytesIO(content))
    slides = []
    for idx, slide in enumerate(prs.slides):
        slide_lines = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    line = paragraph.text.strip()
                    if line:
                        slide_lines.append(line)
        if slide_lines:
            slides.append({
                "text": "\n".join(slide_lines),
                "page_or_section": f"Slide {idx + 1}",
                "page_num": idx + 1,
                "sheet_name": None,
            })
    return slides


def extract_html(content: bytes) -> List[Dict[str, Any]]:
    """Extract readable text from HTML files after removing scripts and styles."""
    soup = BeautifulSoup(content, "html.parser")
    for script_or_style in soup(["script", "style", "nav", "footer"]):
        script_or_style.decompose()

    text = soup.get_text(separator="\n").strip()
    clean_lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not clean_lines:
        return []

    title = soup.title.string.strip() if soup.title and soup.title.string else "Web Document"
    return [{
        "text": "\n".join(clean_lines),
        "page_or_section": f"HTML: {title}",
        "page_num": None,
        "sheet_name": None,
    }]


def extract_text_from_file(filename: str, content: bytes) -> List[Dict[str, Any]]:
    """Directs a file to its proper extractor based on extension."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == ".pdf":
        return extract_pdf(content)
    elif ext == ".docx":
        return extract_docx(content)
    elif ext == ".pptx":
        return extract_pptx(content)
    elif ext == ".html":
        return extract_html(content)
    elif ext in [".txt", ".md"]:
        text = content.decode("utf-8", errors="replace").strip()
        return [{
            "text": text,
            "page_or_section": "Document Text",
            "page_num": 1,
            "sheet_name": None,
        }] if text else []
    return []
