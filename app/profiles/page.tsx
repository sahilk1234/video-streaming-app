import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileForm from "@/components/profile/ProfileForm";
import { redirect } from "next/navigation";

export default async function ProfilesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profiles = await prisma.profile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12">
      <div className="space-y-3">
        <h1 className="font-display text-4xl text-text">Who is watching?</h1>
        <p className="text-muted">Select a profile or create a new one.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={{
              id: profile.id,
              name: profile.name,
              avatar: profile.avatar,
              isKids: profile.isKids
            }}
          />
        ))}
      </div>

      <div className="glass rounded-3xl p-8">
        <h2 className="text-xl font-semibold text-text">Create profile</h2>
        <p className="mb-6 text-sm text-muted">Add another viewer to your account.</p>
        <ProfileForm />
      </div>
    </div>
  );
}
