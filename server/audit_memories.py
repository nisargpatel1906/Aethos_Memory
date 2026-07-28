import dotenv
dotenv.load_dotenv("c:/Users/Nisarg Patel/Documents/Aethos_Memory/server/.env")
from aethos_memory.db import get_supabase_client
from datetime import datetime, timedelta, timezone

sb = get_supabase_client()
now = datetime.now(timezone.utc)
ten_mins_ago = (now - timedelta(minutes=60)).isoformat()

res = sb.table("memories").select("id, project, content, source_tool, created_at").order("created_at", desc=True).limit(500).execute()

print(f"=== FULL AUDIT OF LAST 500 MEMORIES IN SUPABASE ===")
print(f"Total memories returned: {len(res.data)}")

tool_counts = {}
recent_items = []

for m in res.data:
    tool = m.get("source_tool") or "Unknown"
    tool_counts[tool] = tool_counts.get(tool, 0) + 1
    recent_items.append(m)

print("\n--- MEMORY COUNT BY SOURCE TOOL ---")
for tool, count in tool_counts.items():
    print(f"  • {tool}: {count}")

print("\n--- RECENT 20 MEMORIES CONTENT SAMPLE ---")
for m in recent_items[:20]:
    print(f"[{m.get('created_at')}] Tool: {m.get('source_tool')} | ID: {m.get('id')}")
    print(f"  Content: {m.get('content')[:120]}...\n")
