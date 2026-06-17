import { GoogleGenerativeAI } from "@google/generative-ai";

export async function parseResumePdf(buffer: Buffer): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: buffer.toString("base64"),
      },
    },
    "이 PDF 이력서의 모든 텍스트를 원문 그대로 추출해주세요. 요약하거나 변경하지 말고 내용만 추출하세요.",
  ]);

  return result.response.text().trim();
}
