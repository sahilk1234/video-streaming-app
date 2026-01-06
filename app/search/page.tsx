import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getCurrentProfileId } from "@/lib/profile";
import { redirect } from "next/navigation";
import TitleCard from "@/components/title/TitleCard";
import SearchBar from "@/components/title/SearchBar";

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string; genre?: string; sort?: string };
}) {
  const profileId = getCurrentProfileId();
  if (!profileId) {
    redirect("/profiles");
  }

  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });

  const where: any = {};
  if (searchParams.q) {
    where.name = { contains: searchParams.q, mode: "insensitive" };
  }
  if (searchParams.genre) {
    where.genres = { some: { genre: { name: searchParams.genre } } };
  }

  const orderBy: Prisma.TitleOrderByWithRelationInput =
    searchParams.sort === "rating" ? { rating: "desc" } : { year: "desc" };

  const titles = await prisma.title.findMany({
    where,
    include: { posterAsset: true },
    orderBy
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="font-display text-4xl text-text">Search</h1>
        <p className="text-muted">Find your next obsession.</p>
      </div>

      <SearchBar genres={genres.map((genre) => genre.name)} />

      {titles.length === 0 ? (
        <p className="text-muted">No matches. Try a new query.</p>
      ) : (
        <div className="flex flex-wrap gap-6">
          {titles.map((title) => (
            <TitleCard key={title.id} title={title as any} profileId={profileId} />
          ))}
        </div>
      )}
    </div>
  );
}
