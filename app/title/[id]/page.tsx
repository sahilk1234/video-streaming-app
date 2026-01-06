import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/profile";
import { getAssetUrl } from "@/lib/storage";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import WatchlistButton from "@/components/title/WatchlistButton";
import TitleRowCarousel from "@/components/title/TitleRowCarousel";

export default async function TitleDetailPage({ params }: { params: { id: string } }) {
  const profileId = getCurrentProfileId();
  if (!profileId) {
    redirect("/profiles");
  }

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
          episodes: { include: { videoAsset: true } }
        },
        orderBy: { seasonNumber: "asc" }
      }
    }
  });

  if (!title) {
    notFound();
  }

  const genreIds = title.genres.map((genre) => genre.genreId);
  const moreLikeThis = await prisma.title.findMany({
    where: {
      id: { not: title.id },
      genres: { some: { genreId: { in: genreIds } } }
    },
    include: { posterAsset: true },
    take: 8
  });

  const backdropUrl = title.backdropAsset ? getAssetUrl(title.backdropAsset as any) : null;
  const posterUrl = title.posterAsset ? getAssetUrl(title.posterAsset as any) : null;

  const firstEpisode = title.seasons.flatMap((season) => season.episodes)[0];
  const movieReady = title.type === "MOVIE" && Boolean(title.videoAssetId);
  const episodeReady = title.type === "SERIES" && Boolean(firstEpisode?.videoAssetId);
  const playTarget = movieReady
    ? `/watch/${title.id}`
    : episodeReady && firstEpisode
      ? `/watch/${firstEpisode.id}`
      : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <section className="grid gap-8 md:grid-cols-[280px,1fr]">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface/70">
          {posterUrl ? (
            <img src={posterUrl} alt={title.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-80 items-center justify-center text-muted">No poster</div>
          )}
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {title.genres.map((genre) => (
                <Badge key={genre.genreId}>{genre.genre.name}</Badge>
              ))}
            </div>
            <h1 className="font-display text-5xl text-text">{title.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted">
              <span>{title.year}</span>
              <span>{title.runtimeMins ? `${title.runtimeMins} min` : "Series"}</span>
              <span>{title.maturityRating}</span>
            </div>
          </div>
          <p className="text-muted leading-relaxed">{title.description}</p>
          <div className="flex flex-wrap gap-4">
            {playTarget ? (
              <Link
                href={playTarget}
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
              >
                Play
              </Link>
            ) : (
              <span className="text-sm text-muted">No playable asset yet</span>
            )}
            <WatchlistButton titleId={title.id} profileId={profileId} />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Cast</h3>
            <p className="text-sm text-text">
              {title.people.map((person) => `${person.person.name} (${person.roleName})`).join(", ") ||
                "No cast yet"}
            </p>
          </div>
        </div>
      </section>

      {backdropUrl && (
        <div className="overflow-hidden rounded-3xl border border-border">
          <img src={backdropUrl} alt={`${title.name} backdrop`} className="h-64 w-full object-cover" />
        </div>
      )}

      {title.type === "SERIES" && title.seasons.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text">Episodes</h2>
          <div className="space-y-4">
            {title.seasons.map((season) => (
              <div key={season.id} className="glass rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-text">{season.name}</h3>
                <div className="mt-4 space-y-3">
                  {season.episodes.map((episode) => (
                    <div key={episode.id} className="flex items-center justify-between gap-6 border-b border-border/50 pb-3 last:border-none">
                      <div>
                        <p className="text-sm font-semibold text-text">Episode {episode.episodeNumber}: {episode.name}</p>
                        <p className="text-xs text-muted">{episode.description}</p>
                      </div>
                      {episode.videoAssetId ? (
                        <Link
                          href={`/watch/${episode.id}`}
                          className="rounded-full border border-border px-4 py-2 text-xs text-text"
                        >
                          Play
                        </Link>
                      ) : (
                        <span className="rounded-full border border-border px-4 py-2 text-xs text-muted">Processing</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <TitleRowCarousel label="More like this" titles={moreLikeThis} profileId={profileId} />
    </div>
  );
}
