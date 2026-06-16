import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseResumePdf } from "@/lib/parseResume";
import { fetchJdText } from "@/lib/parseJd";
import { generateQuestions } from "@/lib/ai";

export async function GET() {
  try {
    const interviews = await prisma.interview.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        field: true,
        createdAt: true,
        questions: {
          select: { answer: { select: { id: true } } },
        },
      },
    });

    const summaries = interviews.map((iv) => ({
      id: iv.id,
      field: iv.field,
      createdAt: iv.createdAt,
      totalQuestions: iv.questions.length,
      answeredQuestions: iv.questions.filter((q) => q.answer !== null).length,
    }));

    return NextResponse.json(summaries);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File | null;
    const jdUrl = (formData.get("jdUrl") as string | null)?.trim() || null;

    let resumeText: string | undefined;
    let jdText: string | undefined;

    if (resumeFile && resumeFile.size > 0) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      resumeText = await parseResumePdf(buffer);
    }

    if (jdUrl) {
      jdText = await fetchJdText(jdUrl);
    }

    if (!resumeText && !jdText) {
      return NextResponse.json(
        { error: "이력서 PDF 또는 JD 링크 중 최소 하나는 입력해야 합니다." },
        { status: 400 }
      );
    }

    const pastQuestions = await prisma.question.findMany({
      where: {
        interview: {
          OR: [
            ...(resumeText ? [{ resumeText }] : []),
            ...(jdUrl ? [{ jdUrl }] : []),
          ],
        },
      },
      orderBy: { id: "desc" },
      take: 40,
      select: { text: true },
    });

    const { field, questions } = await generateQuestions({
      resumeText,
      jdText,
      avoidQuestions: pastQuestions.map((q) => q.text),
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "질문을 생성하지 못했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    const interview = await prisma.interview.create({
      data: {
        field,
        resumeText,
        jdText,
        jdUrl,
        questions: {
          create: questions.map((text, index) => ({ text, order: index })),
        },
      },
    });

    return NextResponse.json({ id: interview.id });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
