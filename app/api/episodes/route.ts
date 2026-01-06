import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { episodeSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId required" }, { status: 400 });
  }

  const episodes = await prisma.episode.findMany({
    where: { seasonId },
    orderBy: { episodeNumber: "asc" }
  });

  return NextResponse.json(episodes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = episodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const episode = await prisma.episode.create({
    data: {
      seasonId: parsed.data.seasonId,
      episodeNumber: parsed.data.episodeNumber,
      name: parsed.data.name,
      description: parsed.data.description,
      runtimeMins: parsed.data.runtimeMins ?? null
    }
  });

  return NextResponse.json(episode, { status: 201 });
}
