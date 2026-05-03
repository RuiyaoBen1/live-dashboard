"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchMessages, postMessage, deleteMessage, type Message } from "@/lib/api";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso + "Z");
    return d.toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit", month: "numeric", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(() => {
    fetchMessages().then(setMessages).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim() || sending) return;
    setSending(true);
    try {
      const msg = await postMessage(author.trim(), content.trim());
      setMessages((prev) => [msg, ...prev].slice(0, 50));
      setContent("");
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!deletePassword.trim()) {
      setDeleteError("请输入密码");
      return;
    }
    setDeleteError("");
    try {
      await deleteMessage(id, deletePassword.trim());
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setDeletingId(null);
      setDeletePassword("");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="vn-bubble p-3">
      <p className="text-xs font-bold text-[var(--color-primary)] mb-2">留言板</p>

      <form onSubmit={handleSubmit} className="space-y-1.5 mb-3">
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="你的昵称"
          maxLength={50}
          className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border)] bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        <div className="flex gap-1">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="说点什么..."
            maxLength={500}
            className="flex-1 px-2 py-1 text-xs rounded border border-[var(--color-border)] bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={sending || !author.trim() || !content.trim()}
            className="px-2 py-1 text-xs rounded bg-[var(--color-primary)] text-white disabled:opacity-40 hover:brightness-110 transition"
          >
            发送
          </button>
        </div>
      </form>

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-[10px] text-[var(--color-text-muted)] text-center py-2">还没有留言~</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-xs group relative">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-[var(--color-primary)]">{msg.author}</span>
                <span className="text-[9px] text-[var(--color-text-muted)]">{formatTime(msg.created_at)}</span>
                <button
                  type="button"
                  onClick={() => { setDeletingId(deletingId === msg.id ? null : msg.id); setDeleteError(""); setDeletePassword(""); }}
                  className="ml-auto text-[9px] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-primary)] transition-opacity"
                >
                  删除
                </button>
              </div>
              <p className="text-[var(--color-text)] leading-snug">{msg.content}</p>

              {deletingId === msg.id && (
                <div className="mt-1 flex gap-1 items-center">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleDelete(msg.id); } }}
                    placeholder="输入密码"
                    maxLength={20}
                    className="w-20 px-1.5 py-0.5 text-[10px] rounded border border-[var(--color-border)] bg-transparent text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(msg.id)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--color-primary)] text-white hover:brightness-110"
                  >
                    确认
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeletingId(null); setDeletePassword(""); setDeleteError(""); }}
                    className="px-1.5 py-0.5 text-[10px] rounded border border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  >
                    取消
                  </button>
                  {deleteError && <span className="text-[9px] text-red-400">{deleteError}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
