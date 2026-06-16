import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { answer: true },
        },
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "면접을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(interview);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const answers = await prisma.answer.findMany({
    where: { question: { interviewId: id }, audioPath: { not: null } },
    select: { audioPath: true },
  });

  const deleted = await prisma.interview.deleteMany({ where: { id } });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "면접을 찾을 수 없습니다." }, { status: 404 });
  }

  await Promise.all(
    answers.map((a) =>
      a.audioPath
        ? unlink(path.join(process.cwd(), "public", a.audioPath)).catch(() => {})
        : Promise.resolve()
    )
  );

  return NextResponse.json({ ok: true });
}
