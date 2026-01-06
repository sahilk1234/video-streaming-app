import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { titleSchema } from "@/lib/validation";

export async function GET() {
  const titles = await prisma.title.findMany({
    include: {
      posterAsset: true,
      backdropAsset: true,
      genres: { include: { genre: true } },
      people: { include: { person: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(titles);
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
  const parsed = titleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const genreNames = Array.from(new Set(parsed.data.genres));
  const genres = await Promise.all(
    genreNames.map((name) =>
      prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const title = await prisma.title.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description,
      year: parsed.data.year,
      runtimeMins: parsed.data.runtimeMins ?? null,
      maturityRating: parsed.data.maturityRating,
      rating: parsed.data.rating ?? 0,
      genres: {
        create: genres.map((genre) => ({ genreId: genre.id }))
      },
      people: {
        create: await Promise.all(
          Array.from(new Map(parsed.data.cast.map((c) => [`${c.name}:${c.roleName}`, c])).values()).map(
            async (castMember) => {
              const person = await prisma.person.upsert({
                where: { name: castMember.name },
                update: {},
                create: { name: castMember.name }
              });
              return {
                personId: person.id,
                roleName: castMember.roleName
              };
            }
          )
        )
      }
    }
  });

  return NextResponse.json(title, { status: 201 });
}
