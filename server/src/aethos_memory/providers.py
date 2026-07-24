import json
import re
import httpx
from aethos_memory.config import get_config


def _clean_json_response(text: str) -> str:
    """Defensively strip markdown code fences and whitespace from raw LLM output."""
    text = text.strip()
    # Remove markdown code block fences if present (```json ... ``` or ``` ...)
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def call_extraction(prompt: str) -> dict:
    """Extract atomic facts from text using Groq with fallback to OpenRouter.

    Returns parsed JSON dict.
    Fails loud if both providers fail.
    """
    cfg = get_config()

    # 1. Try Groq (Primary)
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
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            cleaned = _clean_json_response(raw_text)
            return json.loads(cleaned)
    except Exception as groq_err:
        # Fall through to OpenRouter
        pass

    # 2. Try OpenRouter (Fallback)
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {cfg.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/aethos-memory",
            "X-Title": "Aethos Memory",
        }
        payload = {
            "model": "meta-llama/llama-3.1-8b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            cleaned = _clean_json_response(raw_text)
            return json.loads(cleaned)
    except Exception as openrouter_err:
        raise RuntimeError(
            "Memory extraction failed — both primary provider (Groq) and fallback provider (OpenRouter) were unavailable. "
            "Please check API keys and connectivity."
        )


def call_embedding(text: str) -> list[float]:
    """Generate 768-dimensional embedding vector using Gemini gemini-embedding-001.

    No fallback provider permitted to prevent vector space corruption.
    Fails loud on error.
    """
    cfg = get_config()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={cfg.gemini_api_key}"
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": 768,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            embedding = data.get("embedding", {}).get("values")
            if not embedding or not isinstance(embedding, list):
                raise ValueError("Response missing embedding values array")
            return embedding
    except Exception as err:
        raise RuntimeError(
            f"Embedding generation failed via Gemini (gemini-embedding-001): {str(err)}. "
            "Note: Embedding generation does not fall back to other providers to avoid vector space corruption."
        )
