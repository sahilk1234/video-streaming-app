import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { watchlistSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") || cookies().get("profileId")?.value;
  if (!profileId) {
    return NextResponse.json({ error: "Profile required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile || profile.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const watchlist = await prisma.watchlist.findMany({
    where: { profileId },
    include: { title: { include: { posterAsset: true, backdropAsset: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(watchlist);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = watchlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: parsed.data.profileId } });
  if (!profile || profile.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.watchlist.findUnique({
    where: {
      profileId_titleId: {
        profileId: parsed.data.profileId,
        titleId: parsed.data.titleId
      }
    }
  });

  if (existing) {
    await prisma.watchlist.delete({ where: { id: existing.id } });
    return NextResponse.json({ added: false });
  }

  await prisma.watchlist.create({
    data: {
      profileId: parsed.data.profileId,
      titleId: parsed.data.titleId
    }
  });

  return NextResponse.json({ added: true });
}
