import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { progressSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: parsed.data.profileId } });
  if (!profile || profile.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const progress = await prisma.watchProgress.upsert({
    where: {
      profileId_assetId: {
        profileId: parsed.data.profileId,
        assetId: parsed.data.assetId
      }
    },
    update: {
      positionSeconds: parsed.data.positionSeconds,
      durationSeconds: parsed.data.durationSeconds,
      titleId: parsed.data.titleId ?? null,
      episodeId: parsed.data.episodeId ?? null
    },
    create: {
      profileId: parsed.data.profileId,
      assetId: parsed.data.assetId,
      positionSeconds: parsed.data.positionSeconds,
      durationSeconds: parsed.data.durationSeconds,
      titleId: parsed.data.titleId ?? null,
      episodeId: parsed.data.episodeId ?? null
    }
  });

  return NextResponse.json(progress);
}
