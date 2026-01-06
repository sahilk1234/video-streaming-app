import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/profile";
import TitleRowCarousel from "@/components/title/TitleRowCarousel";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const profileId = getCurrentProfileId();
  if (!profileId) {
    redirect("/profiles");
  }

  const [trending, newReleases, topRated, progress] = await Promise.all([
    prisma.title.findMany({
      orderBy: { createdAt: "desc" },
      include: { posterAsset: true },
      take: 10
    }),
    prisma.title.findMany({
      orderBy: { year: "desc" },
      include: { posterAsset: true },
      take: 10
    }),
    prisma.title.findMany({
      orderBy: { rating: "desc" },
      include: { posterAsset: true },
      take: 10
    }),
    prisma.watchProgress.findMany({
      where: { profileId },
      include: {
        title: { include: { posterAsset: true } },
        episode: {
          include: {
            season: {
              include: {
                title: { include: { posterAsset: true } }
              }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 10
    })
  ]);

  const continueTitles = new Map<string, any>();
  for (const item of progress) {
    const title = item.title || item.episode?.season.title;
    if (title && !continueTitles.has(title.id)) {
      continueTitles.set(title.id, title);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <div className="space-y-4">
        <h1 className="font-display text-5xl text-text">Welcome back</h1>
        <p className="text-muted">Pick up where you left off and discover new releases.</p>
      </div>

      <TitleRowCarousel label="Continue Watching" titles={Array.from(continueTitles.values())} profileId={profileId} />
      <TitleRowCarousel label="Trending" titles={trending} profileId={profileId} />
      <TitleRowCarousel label="New Releases" titles={newReleases} profileId={profileId} />
      <TitleRowCarousel label="Top Rated" titles={topRated} profileId={profileId} />
    </div>
  );
}
