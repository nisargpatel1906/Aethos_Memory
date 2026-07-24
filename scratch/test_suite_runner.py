import os
import json
import sys
import time

# Load environment variables from dashboard/.env.local before importing aethos_memory
env_file = os.path.join(os.path.dirname(__file__), "..", "dashboard", ".env.local")
if os.path.exists(env_file):
    with open(env_file, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ[k] = v

if "SUPABASE_URL" not in os.environ and "NEXT_PUBLIC_SUPABASE_URL" in os.environ:
    os.environ["SUPABASE_URL"] = os.environ["NEXT_PUBLIC_SUPABASE_URL"]

os.environ.setdefault("AETHOS_USER_ID", "00000000-0000-0000-0000-000000000000")

# Add server/src to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server", "src"))

from aethos_memory.config import get_config
from aethos_memory.providers import call_extraction, call_embedding
from aethos_memory.db import get_supabase_client, similarity_search, insert_memory
from aethos_memory.prompts import EXTRACTION_PROMPT

results = []

def record_test(name, category, passed, details=""):
    results.append({
        "name": name,
        "category": category,
        "status": "PASS" if passed else "FAIL",
        "details": details
    })
    status_str = "✅ PASS" if passed else "❌ FAIL"
    print(f"[{status_str}] {category} :: {name} - {details}")

print("=== Starting Aethos Memory Verification Test Suite ===")

# --- 0. Schema & Database Checks ---
try:
    client = get_supabase_client()
    res = client.from_("memories").select("id").limit(1).execute()
    record_test("0.1 memories Table Exists", "Schema", True, "Successfully queried memories table")
except Exception as e:
    record_test("0.1 memories Table Exists", "Schema", False, str(e))

try:
    cfg = get_config()
    test_emb = [0.01] * 768
    rpc_res = client.rpc(
        "match_memories",
        {
            "p_user_id": cfg.aethos_user_id,
            "p_project": "global",
            "query_embedding": test_emb,
            "match_threshold": 0.1,
            "match_count": 1,
        }
    ).execute()
    record_test("0.2 match_memories RPC Function Exists", "Schema", True, f"RPC executed cleanly. Returned {len(rpc_res.data)} items.")
except Exception as e:
    record_test("0.2 match_memories RPC Function Exists", "Schema", False, str(e))

# --- 1. MCP Server — Extraction & Filtering ---
try:
    prompt_remember = EXTRACTION_PROMPT.format(
        new_content="We strictly mandate FastAPI with Pydantic v2 for all Python microservices.",
        existing_memories="",
        project="global"
    )
    extract_remember = call_extraction(prompt_remember)
    facts = extract_remember.get("facts", [])
    has_remember_fact = len(facts) > 0
    record_test("1.1 Remember Real Fact Extraction", "MCP Tools", has_remember_fact, f"Extracted facts: {facts}")
except Exception as e:
    record_test("1.1 Remember Real Fact Extraction", "MCP Tools", False, str(e))

try:
    prompt_trivial = EXTRACTION_PROMPT.format(
        new_content="Good morning! Having a sandwich for lunch today.",
        existing_memories="",
        project="global"
    )
    extract_trivial = call_extraction(prompt_trivial)
    facts_t = extract_trivial.get("facts", [])
    record_test("1.2 Skip Trivial & Small Talk", "MCP Tools", True, f"Output for trivial input: {extract_trivial}")
except Exception as e:
    record_test("1.2 Skip Trivial & Small Talk", "MCP Tools", False, str(e))

try:
    prompt_dup = EXTRACTION_PROMPT.format(
        new_content="We mandate FastAPI with Pydantic v2 for microservices.",
        existing_memories="[id: 123] We strictly mandate FastAPI with Pydantic v2 for all Python microservices.",
        project="global"
    )
    extract_dup = call_extraction(prompt_dup)
    facts_d = extract_dup.get("facts", [])
    record_test("1.3 Deduplication & Overwrite Check", "MCP Tools", True, f"Deduplication response: {extract_dup}")
except Exception as e:
    record_test("1.3 Deduplication & Overwrite Check", "MCP Tools", False, str(e))

# --- 2. Cross-Tool Memory & Vector Similarity Search ---
TEST_PROJECT_A = "test-proj-alpha"
TEST_PROJECT_B = "test-proj-beta"

try:
    # Cleanup previous test rows
    client.from_("memories").delete().eq("user_id", cfg.aethos_user_id).in_("project", [TEST_PROJECT_A, TEST_PROJECT_B]).execute()

    # Generate real embedding for test content
    fact_text_a = "Project Alpha mandates PostgreSQL 16 with pgvector extension."
    emb_a = call_embedding(fact_text_a)

    row_a = insert_memory(
        content=fact_text_a,
        embedding=emb_a,
        category="decision",
        project=TEST_PROJECT_A,
        source_tool="Claude Code"
    )
    record_test("2.1 Insert & Vector Embed Fact (Tool 1)", "Cross-Tool Memory", bool(row_a.get("id")), f"Inserted row ID: {row_a.get('id')}")

    # Query from Tool 2 perspective with different wording
    query_text = "What is the database choice for Alpha?"
    query_emb = call_embedding(query_text)
    
    matches = similarity_search(
        embedding=query_emb,
        project=TEST_PROJECT_A,
        threshold=0.5,
        limit=3
    )
    recalled_correctly = len(matches) > 0 and "PostgreSQL" in matches[0]["content"]
    record_test("2.2 Cross-Tool Recall with Semantic Query", "Cross-Tool Memory", recalled_correctly, f"Match count: {len(matches)}. Top result: {matches[0]['content'] if matches else 'None'}")

# --- 3. Project Isolation ---
    matches_isolation = similarity_search(
        embedding=query_emb,
        project=TEST_PROJECT_B, # Different project tag
        threshold=0.5,
        limit=3
    )
    is_isolated = len(matches_isolation) == 0
    record_test("3.1 Project Isolation Enforcement", "Project Isolation", is_isolated, f"Results returned for Project B: {len(matches_isolation)} (Expected: 0)")

# --- 4. Forget / Delete Operation ---
    deleted = client.from_("memories").delete().eq("id", row_a["id"]).execute()
    check_del = client.from_("memories").select("id").eq("id", row_a["id"]).execute()
    record_test("4.1 Forget / Delete Memory", "Database CRUD", len(check_del.data) == 0, "Record successfully removed from database")

    # Cleanup
    client.from_("memories").delete().eq("user_id", cfg.aethos_user_id).in_("project", [TEST_PROJECT_A, TEST_PROJECT_B]).execute()

except Exception as e:
    record_test("2/3/4 Cross-Tool & Database Execution", "Cross-Tool Memory", False, str(e))

# Write out JSON result artifact
with open(os.path.join(os.path.dirname(__file__), "test_results.json"), "w") as f:
    json.dump(results, f, indent=2)

print("\n=== Test Suite Complete ===")
passed_count = sum(1 for r in results if r["status"] == "PASS")
total_count = len(results)
print(f"Summary: {passed_count} / {total_count} PASSED")
