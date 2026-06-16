"use client";

import { useRef, useState } from "react";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

function createSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

interface RecorderProps {
  onRecorded: (blob: Blob | null) => void;
  onTranscript?: (text: string) => void;
}

export default function Recorder({ onRecorded, onTranscript }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported] = useState(() => createSpeechRecognition() !== null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        onRecorded(blob);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      if (onTranscript) {
        finalTranscriptRef.current = "";
        const recognition = createSpeechRecognition();
        if (recognition) {
          recognition.lang = "ko-KR";
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) {
                finalTranscriptRef.current += res[0].transcript;
              } else {
                interim += res[0].transcript;
              }
            }
            onTranscript((finalTranscriptRef.current + interim).trim());
          };
          recognition.onend = () => {
            if (recognitionRef.current === recognition) {
              recognitionRef.current = null;
            }
          };
          recognition.start();
          recognitionRef.current = recognition;
        }
      }
    } catch {
      setError("마이크 접근 권한이 필요합니다.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const clearRecording = () => {
    setAudioUrl(null);
    onRecorded(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="cursor-pointer rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            🎙 녹음 시작
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="cursor-pointer rounded-full bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 animate-pulse"
          >
            ⏹ 녹음 정지
          </button>
        )}
        {audioUrl && !isRecording && (
          <button
            type="button"
            onClick={clearRecording}
            className="cursor-pointer text-sm text-gray-500 underline"
          >
            녹음 삭제
          </button>
        )}
      </div>
      {onTranscript && !speechSupported && (
        <p className="text-xs text-zinc-400">
          이 브라우저는 음성 자동 텍스트 변환을 지원하지 않아요 (Chrome 권장). 녹음은 정상적으로 가능합니다.
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {audioUrl && (
        <audio controls src={audioUrl} className="w-full">
          <track kind="captions" />
        </audio>
      )}
    </div>
  );
}
