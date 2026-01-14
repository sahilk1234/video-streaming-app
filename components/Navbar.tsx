import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/profile";
import ProfileSwitcher from "@/components/profile/ProfileSwitcher";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const currentProfileId = getCurrentProfileId();
  const profiles = session?.user?.id
    ? await prisma.profile.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" }
      })
    : [];

  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/home" className="font-display text-3xl tracking-wide text-accent">
            Streamly
          </Link>
          <div className="hidden items-center gap-6 text-sm text-muted md:flex">
            <Link href="/home" className="hover:text-text">
              Home
            </Link>
            <Link href="/my-list" className="hover:text-text">
              My List
            </Link>
            <Link href="/search" className="hover:text-text">
              Search
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link href="/admin" className="hover:text-text">
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ProfileSwitcher
            profiles={profiles.map((profile) => ({
              id: profile.id,
              name: profile.name,
              avatar: profile.avatar,
              isKids: profile.isKids
            }))}
            currentProfileId={currentProfileId}
          />
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
