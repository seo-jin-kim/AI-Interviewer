import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { generateExampleAnswer } from "@/lib/ai";

const RECORDINGS_DIR = path.join(process.cwd(), "public", "recordings");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const questionId = formData.get("questionId") as string | null;
    const answerText = (formData.get("answerText") as string | null) ?? "";
    const audio = formData.get("audio") as File | null;

    if (!questionId) {
      return NextResponse.json({ error: "questionId가 필요합니다." }, { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { interview: true },
    });

    if (!question) {
      return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!answerText.trim() && (!audio || audio.size === 0)) {
      return NextResponse.json(
        { error: "텍스트 답변 또는 녹음 중 하나는 필요합니다." },
        { status: 400 }
      );
    }

    let audioPath: string | undefined;
    if (audio && audio.size > 0) {
      await mkdir(RECORDINGS_DIR, { recursive: true });
      const filename = `${questionId}-${Date.now()}.webm`;
      const buffer = Buffer.from(await audio.arrayBuffer());
      await writeFile(path.join(RECORDINGS_DIR, filename), buffer);
      audioPath = `/recordings/${filename}`;
    }

    const exampleAnswer = await generateExampleAnswer({
      question: question.text,
      answerText,
      resumeText: question.interview.resumeText ?? undefined,
      jdText: question.interview.jdText ?? undefined,
    });

    const answer = await prisma.answer.upsert({
      where: { questionId },
      create: {
        questionId,
        answerText,
        audioPath,
        exampleAnswer,
      },
      update: {
        answerText,
        audioPath,
        exampleAnswer,
      },
    });

    return NextResponse.json(answer);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
