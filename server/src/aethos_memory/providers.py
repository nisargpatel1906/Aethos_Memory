import json
import re
import asyncio
import time
import httpx
import logging

logger = logging.getLogger("aethos_memory.providers")
from aethos_memory.config import get_config

# Module-level persistent HTTP client — reused across all API calls to avoid
# TCP connection overhead on every embedding/extraction request.
_http_client: httpx.AsyncClient | None = None


async def _get_http_client() -> httpx.AsyncClient:
    """Return the shared persistent httpx.AsyncClient, creating it on first use."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=15.0)
    return _http_client


def _clean_json_response(text: str) -> str:
    """Defensively strip markdown code fences and whitespace from raw LLM output."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


async def call_extraction(prompt: str) -> dict:
    """Extract atomic facts from text using Groq with fallback to OpenRouter and Gemini.

    Returns parsed JSON dict.
    Defensively falls back to raw fact insertion if all LLM extraction calls fail/rate-limit.
    """
    cfg = get_config()
    client = await _get_http_client()

    # 1. Try Groq (Primary)
    if cfg.groq_api_key and not cfg.groq_api_key.startswith("gsk_dummy"):
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {cfg.groq_api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            }
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"]
                cleaned = _clean_json_response(raw_text)
                return json.loads(cleaned)
            else:
                logger.warning(f"Groq extraction returned HTTP {resp.status_code}")
        except Exception as e:
            logger.warning(f"Groq extraction failed: {e}")

    # 2. Try OpenRouter (Fallback 1)
    if cfg.openrouter_api_key and not cfg.openrouter_api_key.startswith("sk-or-dummy"):
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {cfg.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/nisargpatel1906/Aethos_Memory",
                "X-Title": "Aethos Memory",
            }
            payload = {
                "model": "meta-llama/llama-3.1-8b-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            }
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"]
                cleaned = _clean_json_response(raw_text)
                return json.loads(cleaned)
            else:
                logger.warning(f"OpenRouter extraction returned HTTP {resp.status_code}")
        except Exception as e:
            logger.warning(f"OpenRouter extraction failed: {e}")

    # 3. Try Gemini Flash (Fallback 2 with rate limit backoff)
    if cfg.gemini_api_key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={cfg.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        }
        for attempt in range(3):
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 429:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    cleaned = _clean_json_response(raw_text)
                    return json.loads(cleaned)
            except Exception as e:
                logger.error(f"Gemini extraction failed: {e}")

    # Safe fallback if LLM extraction services are rate-limited or unavailable
    match_raw = re.search(r"NEW_CONTENT:\s*(.*?)(?:\n-|\n\n|\n[A-Z]|$)", prompt, re.DOTALL)
    extracted_raw = match_raw.group(1).strip() if match_raw else ""
    if extracted_raw:
        return {"facts": [{"content": extracted_raw, "category": "other", "action": "ADD"}]}
    return {"facts": []}


async def call_embedding(text: str) -> list[float]:
    """Generate 768-dimensional embedding vector using Gemini gemini-embedding-001.

    Uses in-memory LRU cache to eliminate duplicate network calls for identical strings.
    Includes exponential backoff retries for HTTP 429 rate limit handling.
    No fallback provider permitted to prevent vector space corruption.
    """
    if not text or not text.strip():
        return [0.0] * 768

    from aethos_memory.caching import cache_manager
    cached_emb = cache_manager.get_embedding(text)
    if cached_emb is not None:
        return cached_emb

    cfg = get_config()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={cfg.gemini_api_key}"
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": 768,
    }

    last_err = None
    client = await _get_http_client()
    for attempt in range(4):
        try:
            resp = await client.post(url, json=payload)
            if resp.status_code == 429 and attempt < 3:
                sleep_time = 2.0 * (attempt + 1)
                logger.warning(f"Gemini embedding 429 rate limit hit. Retrying attempt {attempt + 1} in {sleep_time}s...")
                await asyncio.sleep(sleep_time)
                continue
            resp.raise_for_status()
            data = resp.json()
            embedding = data.get("embedding", {}).get("values")
            if not embedding or not isinstance(embedding, list):
                raise ValueError("Response missing embedding values array")
            cache_manager.set_embedding(text, embedding)
            return embedding
        except Exception as err:
            last_err = err
            if isinstance(err, httpx.HTTPStatusError) and err.response.status_code == 429 and attempt < 3:
                sleep_time = 2.0 * (attempt + 1)
                await asyncio.sleep(sleep_time)
                continue
            if attempt == 3:
                break

    raise RuntimeError(
        f"Embedding generation failed via Gemini (gemini-embedding-001): {str(last_err)}. "
        "Note: Embedding generation does not fall back to other providers to avoid vector space corruption."
    )
