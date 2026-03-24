def parse_text(file_bytes: bytes) -> str:
    """Extract text from a plain text or markdown file."""
    return file_bytes.decode("utf-8", errors="ignore")
