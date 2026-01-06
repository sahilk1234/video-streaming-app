import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { titleSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const title = await prisma.title.findUnique({
    where: { id: params.id },
    include: {
      posterAsset: true,
      backdropAsset: true,
      videoAsset: true,
      subtitleAsset: true,
      genres: { include: { genre: true } },
      people: { include: { person: true } },
      seasons: {
        include: {
          episodes: true
        }
      }
    }
  });

  if (!title) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(title);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

  const title = await prisma.title.findUnique({ where: { id: params.id } });
  if (!title) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  await prisma.titleGenre.deleteMany({ where: { titleId: params.id } });
  await prisma.titlePerson.deleteMany({ where: { titleId: params.id } });

  const updated = await prisma.title.update({
    where: { id: params.id },
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

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.title.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
