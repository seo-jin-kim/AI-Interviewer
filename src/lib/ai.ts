import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.");
    }
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

// 무료 등급 일일/분당 한도가 모델별로 별도라서, 한 모델이 막히면 다음 모델로 자동 전환합니다.
const MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("AI 응답이 너무 오래 걸려요. 잠시 후 다시 시도해주세요.")),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  );
}

async function generateWithFallback(
  prompt: string,
  generationConfig?: GenerationConfig
): Promise<string> {
  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = getClient().getGenerativeModel({
        model: modelName,
        ...(generationConfig ? { generationConfig } : {}),
      });
      const result = await withTimeout(model.generateContent(prompt), 45000);
      return result.response.text();
    } catch (err) {
      if (!isQuotaError(err)) {
        throw err instanceof Error ? err : new Error(String(err));
      }
      // 이 모델의 무료 할당량이 끝났으니 다음 모델로 시도
    }
  }
  throw new Error(
    "오늘의 무료 AI 사용량을 모두 사용했어요. 내일 다시 시도하거나 다른 Gemini API 키로 교체해주세요."
  );
}

export async function generateQuestions(params: {
  resumeText?: string;
  jdText?: string;
  avoidQuestions?: string[];
}): Promise<{ field: string; questions: string[] }> {
  const { resumeText, jdText, avoidQuestions } = params;

  const sourceParts: string[] = [];
  if (resumeText) sourceParts.push(`[이력서]\n${resumeText.slice(0, 8000)}`);
  if (jdText) sourceParts.push(`[채용공고(JD)]\n${jdText.slice(0, 8000)}`);

  const avoidSection =
    avoidQuestions && avoidQuestions.length > 0
      ? `\n\n[이전에 이미 사용한 질문 - 동일하거나 매우 유사한 질문은 절대 다시 내지 마세요]\n${avoidQuestions
          .map((q) => `- ${q}`)
          .join("\n")}`
      : "";

  const prompt = `당신은 채용 면접관입니다. 아래 자료를 참고하여 지원자에게 물어볼 면접 질문을 한국어로 생성하세요.

${sourceParts.join("\n\n")}${avoidSection}

요구사항:
- 자료에 명시된 직무/분야를 파악하고, 해당 분야에서 실제로 자주 나오는 질문 위주로 구성하세요.
- 이력서가 있다면 경력/프로젝트/기술스택에 기반한 구체적 질문을 포함하세요.
- JD가 있다면 JD에 명시된 요구사항/책임에 맞춘 질문을 포함하세요.
- 이전에 이미 사용한 질문 목록이 있다면, 같은 주제라도 다른 관점/다른 표현/다른 디테일로 새롭게 질문하세요.
- 직무 적합성, 기술 역량, 경험, 인성/협업 질문을 적절히 섞어 총 6~8개를 생성하세요.
- 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{"field": "추정한 직무 분야", "questions": ["질문1", "질문2", ...]}`;

  const raw = await generateWithFallback(prompt, {
    responseMimeType: "application/json",
    temperature: 1.3,
  });
  const parsed = JSON.parse(raw) as { field?: string; questions?: string[] };

  return {
    field: parsed.field ?? "일반",
    questions: parsed.questions ?? [],
  };
}

export async function generateExampleAnswer(params: {
  question: string;
  answerText: string;
  resumeText?: string;
  jdText?: string;
}): Promise<string> {
  const { question, answerText, resumeText, jdText } = params;

  const context: string[] = [];
  if (resumeText) context.push(`[이력서 요약]\n${resumeText.slice(0, 4000)}`);
  if (jdText) context.push(`[JD 요약]\n${jdText.slice(0, 4000)}`);

  const prompt = `당신은 면접 코치입니다. 아래 질문에 대해 지원자가 답변했습니다.

질문: ${question}

지원자 답변: ${answerText || "(답변 없음)"}

${context.join("\n\n")}

위 내용을 참고하여, 지원자가 참고할 수 있는 모범 예시답안을 한국어로 작성하세요.
- 지원자의 답변에서 좋은 부분은 살리고 부족한 부분(구체성, 구조, 임팩트 등)을 보완하는 형태로 작성하세요.
- STAR 기법(상황-과업-행동-결과) 등 구조를 활용해 3~5문장 정도로 간결하게 작성하세요.
- 예시답안 텍스트만 출력하세요.`;

  const text = await generateWithFallback(prompt);
  return text.trim();
}
