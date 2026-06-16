"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/Spinner";

interface Question {
  id: string;
  text: string;
  order: number;
  answer: {
    answerText: string;
    audioPath: string | null;
    exampleAnswer: string;
  } | null;
}

interface Interview {
  id: string;
  field: string;
  questions: Question[];
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/interviews/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          let message = "서버 오류가 발생했습니다.";
          try { message = (await res.json()).error ?? message; } catch {}
          throw new Error(message);
        }
        return res.json();
      })
      .then((data: Interview) => setInterview(data))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-zinc-500">
        <Spinner className="h-6 w-6" />
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900">
            면접 결과 ({interview.field})
          </h1>
          <Link href="/" className="cursor-pointer text-sm text-zinc-500 underline">
            새 면접 시작
          </Link>
        </div>

        <div className="flex flex-col gap-5">
          {interview.questions.map((q, i) => (
            <div
              key={q.id}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
            >
              <h2 className="text-sm font-semibold text-zinc-500">질문 {i + 1}</h2>
              <p className="mt-1 font-medium text-zinc-900">{q.text}</p>

              {q.answer ? (
                <div className="mt-4 flex flex-col gap-4">
                  {q.answer.answerText && (
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-700">내 답변</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                        {q.answer.answerText}
                      </p>
                    </div>
                  )}
                  {q.answer.audioPath && (
                    <audio controls src={q.answer.audioPath} className="w-full">
                      <track kind="captions" />
                    </audio>
                  )}
                  <div className="rounded-md bg-emerald-50 p-4 ring-1 ring-emerald-200">
                    <h3 className="text-sm font-semibold text-emerald-800">예시답안</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                      {q.answer.exampleAnswer}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">답변하지 않음</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
