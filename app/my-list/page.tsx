import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/profile";
import { redirect } from "next/navigation";
import TitleCard from "@/components/title/TitleCard";

export default async function MyListPage() {
  const profileId = getCurrentProfileId();
  if (!profileId) {
    redirect("/profiles");
  }

  const watchlist = await prisma.watchlist.findMany({
    where: { profileId },
    include: { title: { include: { posterAsset: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="font-display text-4xl text-text">My List</h1>
        <p className="text-muted">Your saved titles for later.</p>
      </div>
      {watchlist.length === 0 ? (
        <p className="text-muted">Nothing here yet. Start adding titles to your list.</p>
      ) : (
        <div className="flex flex-wrap gap-6">
          {watchlist.map((item) => (
            <TitleCard key={item.id} title={item.title as any} profileId={profileId} />
          ))}
        </div>
      )}
    </div>
  );
}
