import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/profile";
import { getAssetUrl } from "@/lib/storage";
import { notFound, redirect } from "next/navigation";
import VideoPlayer from "@/components/player/VideoPlayer";
import { AssetKind, Prisma } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import TitleRowCarousel from "@/components/title/TitleRowCarousel";

type PlayableTitle = Prisma.TitleGetPayload<{ include: { posterAsset: true } }>;

function formatDuration(seconds?: number | null) {
  if (!seconds || Number.isNaN(seconds)) return null;
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export default async function WatchPage({ params }: { params: { id: string } }) {
  const profileId = getCurrentProfileId();
  if (!profileId) {
    redirect("/profiles");
  }

  const title = await prisma.title.findUnique({
    where: { id: params.id },
    include: { videoAsset: true, subtitleAsset: true, posterAsset: true }
  });

  let playable: PlayableTitle | null = title;
  let episode: Prisma.EpisodeGetPayload<{
    include: {
      videoAsset: true;
      subtitleAsset: true;
      season: { include: { title: { include: { posterAsset: true } } } };
    };
  }> | null = null;
  if (!title) {
    episode = await prisma.episode.findUnique({
      where: { id: params.id },
      include: {
        videoAsset: true,
        subtitleAsset: true,
        season: { include: { title: { include: { posterAsset: true } } } }
      }
    });
    playable = episode?.season.title ?? null;
  }

  if (!playable) {
    notFound();
  }

  const fullTitle = await prisma.title.findUnique({
    where: { id: playable.id },
    include: {
      posterAsset: true,
      backdropAsset: true,
      videoAsset: true,
      subtitleAsset: true,
      genres: { include: { genre: true } },
      people: { include: { person: true } },
      seasons: {
        include: {
          episodes: { include: { videoAsset: true, subtitleAsset: true } }
        },
        orderBy: { seasonNumber: "asc" }
      }
    }
  });

  if (!fullTitle) {
    notFound();
  }

  const mediaJob = await prisma.mediaJob.findFirst({
    where: title ? { titleId: title.id } : { episodeId: episode?.id },
    orderBy: { createdAt: "desc" },
    include: { inputAsset: true, outputHls: true }
  });

  const primaryAsset = title?.videoAsset ?? episode?.videoAsset ?? mediaJob?.outputHls ?? null;
  const isMp4Asset = primaryAsset?.kind === AssetKind.VIDEO_MP4;
  const hlsAsset = isMp4Asset ? null : primaryAsset;
  const mp4Asset = (isMp4Asset ? primaryAsset : mediaJob?.inputAsset) ?? null;
  const subtitleAsset = title?.subtitleAsset ?? episode?.subtitleAsset ?? null;

  if (!hlsAsset && !mp4Asset) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <h1 className="text-2xl font-semibold text-text">Processing media</h1>
        <p className="text-muted">This title is still being processed. Please check back soon.</p>
      </div>
    );
  }

  const assetIdForProgress = hlsAsset?.id || mp4Asset?.id || "";
  const progress = await prisma.watchProgress.findUnique({
    where: {
      profileId_assetId: {
        profileId,
        assetId: assetIdForProgress
      }
    }
  });

  const hlsUrl = hlsAsset ? getAssetUrl(hlsAsset as any) : null;
  const mp4Url = mp4Asset ? getAssetUrl(mp4Asset as any) : null;
  const posterUrl = fullTitle.posterAsset ? getAssetUrl((fullTitle as any).posterAsset) : null;
  const subtitleUrl = subtitleAsset ? getAssetUrl(subtitleAsset as any) : null;
  const description = episode?.description || fullTitle.description;

  const progressPercent = progress?.durationSeconds
    ? Math.min(100, Math.round((progress.positionSeconds / progress.durationSeconds) * 100))
    : 0;
  const timeRemaining = progress?.durationSeconds
    ? formatDuration(progress.durationSeconds - progress.positionSeconds)
    : null;

  const orderedSeasons = fullTitle.seasons.map((season) => ({
    ...season,
    episodes: [...season.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber)
  }));

  const flatEpisodes = orderedSeasons.flatMap((season) =>
    season.episodes.map((episodeItem) => ({
      ...episodeItem,
      seasonNumber: season.seasonNumber,
      seasonId: season.id
    }))
  );

  const currentEpisodeIndex = episode
    ? flatEpisodes.findIndex((ep) => ep.id === episode.id)
    : -1;
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < flatEpisodes.length - 1
      ? flatEpisodes[currentEpisodeIndex + 1]
      : null;

  const genreIds = fullTitle.genres.map((genre) => genre.genreId);
  const moreLikeThis = genreIds.length
    ? await prisma.title.findMany({
        where: {
          id: { not: fullTitle.id },
          genres: { some: { genreId: { in: genreIds } } }
        },
        include: { posterAsset: true },
        take: 8
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted">
          <Link href={`/title/${fullTitle.id}`} className="rounded-full border border-border px-3 py-1 text-xs text-text">
            Back to title
          </Link>
          {episode && (
            <span>Season {episode.season.seasonNumber} Episode {episode.episodeNumber}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge>{fullTitle.maturityRating}</Badge>
          <span className="text-xs text-muted">{fullTitle.year}</span>
          {fullTitle.runtimeMins && (
            <span className="text-xs text-muted">{fullTitle.runtimeMins} min</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-text">
          {fullTitle.name}
          {episode ? ` - ${episode.name}` : ""}
        </h1>
        {description && <p className="text-sm text-muted">{description}</p>}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>Rating: {fullTitle.rating.toFixed(1)}/10</span>
          {fullTitle.genres.length > 0 && (
            <span>{fullTitle.genres.map((genre) => genre.genre.name).join(" / ")}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>Audio: Original</span>
          <span>Subtitles: {subtitleUrl ? "English" : "None"}</span>
        </div>
      </div>

      <VideoPlayer
        hlsUrl={hlsUrl}
        mp4Url={mp4Url}
        posterUrl={posterUrl}
        subtitleUrl={subtitleUrl}
        startAt={progress?.positionSeconds || 0}
        profileId={profileId}
        assetId={assetIdForProgress}
        titleId={title?.id || fullTitle.id}
        episodeId={episode?.id || null}
      />

      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Continue watching</span>
            {timeRemaining && <span>{timeRemaining} left</span>}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
            <div className="h-full bg-accent" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {nextEpisode && (
        <section className="rounded-3xl border border-border/60 bg-surface/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Up Next</p>
              <h3 className="text-lg font-semibold text-text">
                S{nextEpisode.seasonNumber} E{nextEpisode.episodeNumber} - {nextEpisode.name}
              </h3>
              {nextEpisode.description && (
                <p className="text-sm text-muted">{nextEpisode.description}</p>
              )}
            </div>
            <Link
              href={`/watch/${nextEpisode.id}`}
              className="rounded-full bg-accent px-5 py-2 text-xs font-semibold text-accent-foreground"
            >
              Play next
            </Link>
          </div>
        </section>
      )}

      {fullTitle.people.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Cast & Crew</h2>
          <div className="flex flex-wrap gap-2 text-sm text-muted">
            {fullTitle.people.map((person) => (
              <span key={`${person.personId}-${person.roleName}`} className="rounded-full border border-border px-3 py-1">
                {person.person.name} - {person.roleName}
              </span>
            ))}
          </div>
        </section>
      )}

      {fullTitle.type === "SERIES" && orderedSeasons.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Episodes</h2>
          <div className="space-y-4">
            {orderedSeasons.map((season) => (
              <div key={season.id} className="rounded-3xl border border-border/50 bg-surface/60 p-5">
                <h3 className="text-sm font-semibold text-text">Season {season.seasonNumber}</h3>
                <div className="mt-3 space-y-2">
                  {season.episodes.map((episodeItem) => {
                    const isCurrent = episode?.id === episodeItem.id;
                    return (
                      <div
                        key={episodeItem.id}
                        className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-none"
                      >
                        <div>
                          <p className="text-sm font-semibold text-text">
                            Episode {episodeItem.episodeNumber}: {episodeItem.name}
                          </p>
                          {episodeItem.description && (
                            <p className="text-xs text-muted">{episodeItem.description}</p>
                          )}
                        </div>
                        <Link
                          href={`/watch/${episodeItem.id}`}
                          className={`rounded-full px-4 py-2 text-xs ${
                            isCurrent
                              ? "border border-accent/60 text-accent"
                              : "border border-border text-text"
                          }`}
                        >
                          {isCurrent ? "Watching" : "Play"}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {moreLikeThis.length > 0 && (
        <TitleRowCarousel label="More like this" titles={moreLikeThis} profileId={profileId} />
      )}
    </div>
  );
}
