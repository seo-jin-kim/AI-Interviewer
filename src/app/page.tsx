"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/Spinner";

export default function Home() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdUrl, setJdUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowNotice, setSlowNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading) return;
    slowTimerRef.current = setTimeout(() => setSlowNotice(true), 5000);
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resumeFile && !jdUrl.trim()) {
      setError("이력서 PDF 또는 JD 링크 중 최소 하나는 입력해주세요.");
      return;
    }

    setSlowNotice(false);
    setLoading(true);
    try {
      const formData = new FormData();
      if (resumeFile) formData.append("resume", resumeFile);
      if (jdUrl.trim()) formData.append("jdUrl", jdUrl.trim());

      const res = await fetch("/api/interviews", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let message = "면접 생성에 실패했습니다.";
        try { message = (await res.json()).error ?? message; } catch {}
        throw new Error(message);
      }

      const data = await res.json();
      router.push(`/interview/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setLoading(false);
      setSlowNotice(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold text-zinc-900">AI 면접 연습</h1>
            <Link
              href="/history"
              className="mt-1 cursor-pointer text-sm text-zinc-500 hover:text-zinc-700"
            >
              지난 면접 기록 →
            </Link>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            이력서를 업로드하거나 JD 링크를 입력하면, 해당 분야에 맞는 면접 질문을 자동으로
            생성해드려요. 텍스트나 음성(녹음)으로 답변하면 예시답안과 함께 보여드립니다.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-7">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                이력서 (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full cursor-pointer text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <div className="h-px flex-1 bg-zinc-200" />
              그리고/또는
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                JD(채용공고) 링크
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={jdUrl}
                onChange={(e) => setJdUrl(e.target.value)}
                className="mt-2 block w-full rounded-md border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {loading && <Spinner className="h-4 w-4 text-white" />}
              {loading ? "질문 생성 중..." : "면접 시작"}
            </button>
            {slowNotice && (
              <p className="-mt-3 text-center text-xs text-zinc-400">
                AI가 질문을 만드는 중이에요. 최대 30초 정도 걸릴 수 있어요.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
