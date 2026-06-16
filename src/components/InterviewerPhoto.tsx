import Image from "next/image";

export default function InterviewerPhoto({ speaking }: { speaking: boolean }) {
  return (
    <div
      className={`relative h-28 w-28 overflow-hidden rounded-full ring-4 transition-all ${
        speaking ? "ring-emerald-400" : "ring-zinc-200"
      }`}
    >
      <Image
        src="/interviewer.jpg"
        alt="면접관"
        fill
        sizes="112px"
        className="object-cover"
      />
    </div>
  );
}
