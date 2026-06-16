"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Recorder from "@/components/Recorder";
import Spinner from "@/components/Spinner";
import InterviewerPhoto from "@/components/InterviewerPhoto";
import { useSpeak } from "@/lib/useSpeak";

interface Question {
  id: string;
  text: string;
  order: number;
  answer: {
    id: string;
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

export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [interview, setInterview] = useState<Interview | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<Question["answer"] | null>(null);
  const { speak, stop, speaking, supported: speechSupported } = useSpeak();

  useEffect(() => {
    fetch(`/api/interviews/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
      })
      .then((data: Interview) => setInterview(data))
      .catch((err) => setFetchError(err.message));
  }, [id]);

  useEffect(() => {
    if (!interview) return;
    const q = interview.questions[currentIndex];
    if (q) speak(q.text);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview, currentIndex]);

  if (fetchError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-red-500">{fetchError}</p>
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

  const question = interview.questions[currentIndex];
  const isLast = currentIndex === interview.questions.length - 1;

  const handleSubmit = async () => {
    setFormError(null);
    if (!answerText.trim() && !audioBlob) {
      setFormError("텍스트 답변 또는 녹음 중 하나는 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("questionId", question.id);
      formData.append("answerText", answerText);
      if (audioBlob) formData.append("audio", audioBlob, "answer.webm");

      const res = await fetch("/api/answers", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "제출에 실패했습니다.");

      setResult(data);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setAnswerText("");
    setAudioBlob(null);
    setFormError(null);
    setCurrentIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between text-sm text-zinc-500">
          <span>분야: {interview.field}</span>
          <span>
            {currentIndex + 1} / {interview.questions.length}
          </span>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col items-center gap-4 text-center">
            <InterviewerPhoto speaking={speaking} />
            <h2 className="text-lg font-semibold text-zinc-900">{question.text}</h2>
            {speechSupported && (
              <button
                type="button"
                onClick={() => (speaking ? stop() : speak(question.text))}
                className="-mt-2 cursor-pointer rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
              >
                {speaking ? "멈추기" : "다시 듣기"}
              </button>
            )}
          </div>

          {!result ? (
            <div className="mt-5 flex flex-col gap-4">
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="답변을 입력하거나, 마이크로 녹음하면 자동으로 텍스트가 채워져요"
                rows={6}
                className="w-full rounded-md border border-zinc-300 p-3 text-sm focus:border-zinc-900 focus:outline-none"
              />

              <Recorder
                key={question.id}
                onRecorded={setAudioBlob}
                onTranscript={setAnswerText}
              />

              {formError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {formError}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center justify-center gap-2 self-end rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {submitting && <Spinner className="h-4 w-4 text-white" />}
                {submitting ? "채점 중..." : "답변 제출"}
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-700">내 답변</h3>
                {result.answerText && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                    {result.answerText}
                  </p>
                )}
                {result.audioPath && (
                  <audio controls src={result.audioPath} className="mt-2 w-full">
                    <track kind="captions" />
                  </audio>
                )}
              </div>

              <div className="rounded-md bg-emerald-50 p-4 ring-1 ring-emerald-200">
                <h3 className="text-sm font-semibold text-emerald-800">예시답안</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                  {result.exampleAnswer}
                </p>
              </div>

              {!isLast ? (
                <button
                  onClick={handleNext}
                  className="cursor-pointer self-end rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  다음 질문
                </button>
              ) : (
                <Link
                  href={`/interview/${id}/result`}
                  className="cursor-pointer self-end rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  결과 보기
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
