import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { searchSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || undefined;
  const genre = searchParams.get("genre") || undefined;
  const sort = searchParams.get("sort") || undefined;

  const parsed = searchSchema.safeParse({ q, genre, sort });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const where: any = {};
  if (parsed.data.q) {
    where.name = { contains: parsed.data.q, mode: "insensitive" };
  }
  if (parsed.data.genre) {
    where.genres = { some: { genre: { name: parsed.data.genre } } };
  }

  const orderBy: Prisma.TitleOrderByWithRelationInput =
    parsed.data.sort === "rating" ? { rating: "desc" } : { year: "desc" };

  const titles = await prisma.title.findMany({
    where,
    include: {
      posterAsset: true,
      backdropAsset: true,
      genres: { include: { genre: true } }
    },
    orderBy
  });

  return NextResponse.json(titles);
}
