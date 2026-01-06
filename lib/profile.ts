import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export function getCurrentProfileId() {
  return cookies().get("profileId")?.value ?? null;
}

export async function getCurrentProfile() {
  const profileId = getCurrentProfileId();
  if (!profileId) {
    return null;
  }
  return prisma.profile.findUnique({ where: { id: profileId } });
}
