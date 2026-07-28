import os
import dotenv
dotenv.load_dotenv("c:/Users/Nisarg Patel/Documents/Aethos_Memory/server/.env")
from aethos_memory.db import get_supabase_client

sb = get_supabase_client()
res = sb.table("memories").select("id, content, source_tool, created_at").order("created_at", desc=True).limit(10).execute()
print(f"Total recent items: {len(res.data)}")
for row in res.data:
    print(f"ID: {row['id']} | Tool: {row.get('source_tool')} | Created: {row.get('created_at')}")
    print(f"Content: {row.get('content')}\n")
