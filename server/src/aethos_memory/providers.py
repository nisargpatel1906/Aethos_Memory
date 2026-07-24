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
    """Extract atomic facts from text using Groq with fallback to OpenRouter and Gemini.

    Returns parsed JSON dict.
    Defensively falls back to raw fact insertion if all LLM extraction calls fail/rate-limit.
    """
    cfg = get_config()

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
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    cleaned = _clean_json_response(raw_text)
                    return json.loads(cleaned)
        except Exception:
            pass

    # 2. Try OpenRouter (Fallback 1)
    if cfg.openrouter_api_key and not cfg.openrouter_api_key.startswith("sk-or-dummy"):
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
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    cleaned = _clean_json_response(raw_text)
                    return json.loads(cleaned)
        except Exception:
            pass

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
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 429:
                        import time
                        time.sleep(1.5 * (attempt + 1))
                        continue
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                        cleaned = _clean_json_response(raw_text)
                        return json.loads(cleaned)
            except Exception:
                pass

    # Safe fallback if LLM extraction services are rate-limited or unavailable
    match_raw = re.search(r"NEW_CONTENT:\s*(.*?)(?:\n-|\n\n|\n[A-Z]|$)", prompt, re.DOTALL)
    extracted_raw = match_raw.group(1).strip() if match_raw else ""
    if extracted_raw:
        return {"facts": [{"content": extracted_raw, "category": "other", "action": "ADD"}]}
    return {"facts": []}


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
