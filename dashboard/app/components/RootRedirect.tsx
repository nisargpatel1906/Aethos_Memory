"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hasUrl = localStorage.getItem("aethos_supabase_url");
    const hasKey = localStorage.getItem("aethos_supabase_key");
    if (hasUrl && hasKey) {
      router.replace("/feed");
    } else {
      router.replace("/connect");
    }
  }, [router]);

  return null;
}
