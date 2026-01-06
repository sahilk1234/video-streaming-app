import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { seasonSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get("titleId");
  if (!titleId) {
    return NextResponse.json({ error: "titleId required" }, { status: 400 });
  }

  const seasons = await prisma.season.findMany({
    where: { titleId },
    include: { episodes: true },
    orderBy: { seasonNumber: "asc" }
  });

  return NextResponse.json(seasons);
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
  const parsed = seasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const season = await prisma.season.create({
    data: {
      titleId: parsed.data.titleId,
      seasonNumber: parsed.data.seasonNumber,
      name: parsed.data.name
    }
  });

  return NextResponse.json(season, { status: 201 });
}
