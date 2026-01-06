import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.profile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json(profiles);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const profile = await prisma.profile.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      avatar: parsed.data.avatar,
      isKids: parsed.data.isKids ?? false
    }
  });

  return NextResponse.json(profile, { status: 201 });
}
