"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/Spinner";

interface InterviewSummary {
  id: string;
  field: string;
  createdAt: string;
  totalQuestions: number;
  answeredQuestions: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<InterviewSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/interviews")
      .then((res) => res.json())
      .then((data: InterviewSummary[]) => setHistory(data))
      .catch(() => setError("기록을 불러오지 못했습니다."));
  }, []);

  const handleDelete = async (id: string, field: string) => {
    if (!window.confirm(`"${field}" 면접 기록을 삭제할까요? 되돌릴 수 없어요.`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setHistory((prev) => prev?.filter((h) => h.id !== id) ?? prev);
    } catch {
      setError("삭제하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900">지난 면접 기록</h1>
          <Link href="/" className="cursor-pointer text-sm text-zinc-500 underline">
            새 면접 시작
          </Link>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        {!history && !error && (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-zinc-500">
            <Spinner className="h-6 w-6" />
            불러오는 중...
          </div>
        )}

        {history && history.length === 0 && (
          <p className="p-8 text-center text-sm text-zinc-400">
            아직 면접 기록이 없어요.
          </p>
        )}

        {history && history.length > 0 && (
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200"
              >
                <Link
                  href={`/interview/${h.id}/result`}
                  className="flex flex-1 items-center justify-between hover:opacity-70"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{h.field}</p>
                    <p className="text-xs text-zinc-400">{formatDate(h.createdAt)}</p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {h.answeredQuestions}/{h.totalQuestions} 답변완료
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(h.id, h.field)}
                  disabled={deletingId === h.id}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed"
                  aria-label="삭제"
                >
                  {deletingId === h.id ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
