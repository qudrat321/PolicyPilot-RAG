"""Validates uploaded files and checks size, format, and hashes."""
import hashlib
from typing import Tuple

SUPPORTED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".html": "text/html",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB limit for free tier safety


def compute_file_hash(content: bytes) -> str:
    """Calculate the SHA-256 hash of file bytes to find duplicate uploads."""
    return hashlib.sha256(content).hexdigest()


def validate_file(filename: str, content: bytes) -> Tuple[bool, str]:
    """Check if the uploaded file has a valid size and an allowed file extension.

    Returns:
        (True, "") if the file is valid.
        (False, error_message) if the file violates rules.
    """
    if not content or len(content) == 0:
        return False, "File is empty."

    if len(content) > MAX_FILE_SIZE_BYTES:
        return False, f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."

    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        allowed = ", ".join(sorted(SUPPORTED_EXTENSIONS.keys()))
        return False, f"Unsupported file type '{ext}'. Allowed types: {allowed}"

    return True, ""
