import voyageai

from app.config import settings

_client: voyageai.Client | None = None


def _get_client() -> voyageai.Client:
    global _client
    if _client is None:
        _client = voyageai.Client(api_key=settings.VOYAGE_API_KEY)
    return _client


def embed_texts(texts: list[str], input_type: str = "document") -> list[list[float]]:
    """Embed a list of texts using Voyage AI. input_type is 'document' or 'query'."""
    client = _get_client()
    result = client.embed(texts, model="voyage-4", input_type=input_type)
    return result.embeddings


def embed_query(text: str) -> list[float]:
    """Embed a single query text."""
    return embed_texts([text], input_type="query")[0]
