"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

interface MemoryDetail {
  id: string;
  user_id: string;
  project: string;
  content: string;
  category: string;
  source_tool: string | null;
  created_at: string;
  updated_at: string;
}

export default function MemoryEditPage() {
  const params = useParams();
  const router = useRouter();
  const memoryId = params?.id as string;

  const [memory, setMemory] = useState<MemoryDetail | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!memoryId) return;

    const fetchDetail = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("id", memoryId)
        .single();

      if (!error && data) {
        setMemory(data as MemoryDetail);
        setContent(data.content);
      }
      setLoading(false);
    };

    fetchDetail();
  }, [memoryId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !memoryId) return;

    setSaving(true);
    setMessage(null);

    try {
      // 1. Get new vector embedding via serverless reembed route
      const reembedRes = await fetch("/api/reembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!reembedRes.ok) {
        throw new Error("Failed to generate vector embedding");
      }

      const { embedding } = await reembedRes.json();

      // 2. Update content and embedding together in Supabase
      const { error } = await supabase
        .from("memories")
        .update({
          content: content,
          embedding: embedding,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memoryId);

      if (error) throw error;

      setMessage({ text: "Memory and vector embedding updated successfully!", type: "success" });
      setTimeout(() => router.push("/feed"), 1200);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update memory", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!memoryId) return;
    const { error } = await supabase.from("memories").delete().eq("id", memoryId);
    if (!error) {
      router.push("/feed");
    } else {
      setMessage({ text: error.message, type: "error" });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
        Loading memory detail...
      </div>
    );
  }

  if (!memory) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#ef4444" }}>
        Memory record not found.
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "680px", margin: "0 auto" }}>
      {/* Header Navigation */}
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => router.push("/feed")}
          style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.375rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}
        >
          ← Back to Feed
        </button>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          ID: {memory.id}
        </span>
      </div>

      {/* Edit Form Panel */}
      <div className="bg-surface border-subtle" style={{ padding: "2rem", borderRadius: "8px" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>Edit Memory Detail</h1>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Editable Content */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
              MEMORY CONTENT (EDITABLE)
            </label>
            <textarea
              className="input-field"
              style={{ minHeight: "120px", resize: "vertical" }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* Read-Only Metadata */}
          <div style={{ backgroundColor: "#0b1326", padding: "1rem", borderRadius: "4px", border: "1px solid var(--border-color)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
            <div>
              <span style={{ color: "var(--text-secondary)", display: "block" }}>PROJECT</span>
              <span style={{ color: "#10b981", fontWeight: 600 }}>{memory.project}</span>
            </div>

            <div>
              <span style={{ color: "var(--text-secondary)", display: "block" }}>CATEGORY</span>
              <span style={{ color: "var(--text-primary)", textTransform: "uppercase" }}>{memory.category}</span>
            </div>

            <div>
              <span style={{ color: "var(--text-secondary)", display: "block" }}>SOURCE TOOL</span>
              <span style={{ color: "var(--text-primary)" }}>{memory.source_tool || "Manual"}</span>
            </div>

            <div>
              <span style={{ color: "var(--text-secondary)", display: "block" }}>CREATED AT</span>
              <span style={{ color: "var(--text-primary)" }}>{new Date(memory.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: message.type === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                border: `1px solid ${message.type === "error" ? "#ef4444" : "#10b981"}`,
                color: message.type === "error" ? "#f87171" : "#34d399",
              }}
            >
              {message.text}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Re-embedding & Saving..." : "Save Changes"}
            </button>

            {/* Delete Trigger & Confirmation Step */}
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={{ background: "none", border: "1px solid #ef4444", color: "#f87171", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}
              >
                Delete Memory
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "0.375rem 0.75rem", borderRadius: "4px", border: "1px solid #ef4444" }}>
                <span style={{ fontSize: "0.75rem", color: "#f87171" }}>Permanently delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{ background: "#ef4444", color: "#fff", border: "none", padding: "0.25rem 0.5rem", borderRadius: "2px", fontSize: "0.75rem", cursor: "pointer" }}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
