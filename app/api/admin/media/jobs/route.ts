import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get("titleId");
  const episodeId = searchParams.get("episodeId");

  const jobs = await prisma.mediaJob.findMany({
    where: {
      titleId: titleId ?? undefined,
      episodeId: episodeId ?? undefined
    },
    include: {
      inputAsset: true,
      outputHls: true,
      outputThumb: true,
      title: true,
      episode: true
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(jobs);
}
