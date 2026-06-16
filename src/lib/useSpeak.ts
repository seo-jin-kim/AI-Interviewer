"use client";

import { useEffect, useRef, useState } from "react";

const MALE_VOICE_HINTS = ["male", "man", "injoon", "민준", "신구", "준", "남성"];
const FEMALE_VOICE_HINTS = ["female", "woman", "heami", "여성", "선희", "유나"];

function scoreVoiceAsMale(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  if (MALE_VOICE_HINTS.some((hint) => name.includes(hint))) return 2;
  if (FEMALE_VOICE_HINTS.some((hint) => name.includes(hint))) return -1;
  return 0;
}

function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const korean = voices.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  if (korean.length === 0) return null;

  return korean.slice().sort((a, b) => scoreVoiceAsMale(b) - scoreVoiceAsMale(a))[0];
}

export function useSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  );
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [supported]);

  const speak = (text: string) => {
    if (!supported || !text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickKoreanVoice(voicesRef.current);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "ko-KR";
    utterance.rate = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return { speak, stop, speaking, supported };
}
