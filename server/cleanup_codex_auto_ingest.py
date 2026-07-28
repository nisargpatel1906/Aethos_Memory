import dotenv
dotenv.load_dotenv("c:/Users/Nisarg Patel/Documents/Aethos_Memory/server/.env")
from aethos_memory.db import get_supabase_client

sb = get_supabase_client()
res = sb.table("memories").select("id, source_tool, content").execute()

to_delete = []
for row in res.data:
    tool = row.get("source_tool") or ""
    if "Codex CLI" in tool:
        to_delete.append(row["id"])

print(f"Found {len(to_delete)} historical Codex CLI memories to purge...")

# Delete in batches of 50
for i in range(0, len(to_delete), 50):
    batch = to_delete[i:i+50]
    sb.table("memories").delete().in_("id", batch).execute()

print("Successfully purged historical Codex CLI auto-ingested entries!")
