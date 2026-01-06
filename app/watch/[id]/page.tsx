import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/profile";
import { getAssetUrl } from "@/lib/storage";
import { notFound, redirect } from "next/navigation";
import VideoPlayer from "@/components/player/VideoPlayer";
import { Prisma } from "@prisma/client";

type PlayableTitle = Prisma.TitleGetPayload<{ include: { posterAsset: true } }>;

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
  let episode = null;
  if (!title) {
    episode = await prisma.episode.findUnique({
      where: { id: params.id },
      include: { videoAsset: true, subtitleAsset: true, season: { include: { title: { include: { posterAsset: true } } } } }
    });
    playable = episode?.season.title ?? null;
  }

  if (!playable) {
    notFound();
  }

  const mediaJob = await prisma.mediaJob.findFirst({
    where: title ? { titleId: title.id } : { episodeId: episode?.id },
    orderBy: { createdAt: "desc" },
    include: { inputAsset: true, outputHls: true }
  });

  const hlsAsset = title?.videoAsset ?? episode?.videoAsset ?? mediaJob?.outputHls ?? null;
  const mp4Asset = mediaJob?.inputAsset ?? null;
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
  const posterUrl = playable?.posterAsset ? getAssetUrl((playable as any).posterAsset) : null;
  const subtitleUrl = subtitleAsset ? getAssetUrl(subtitleAsset as any) : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-text">{playable.name}</h1>
        {episode && (
          <p className="text-sm text-muted">Episode {episode.episodeNumber}: {episode.name}</p>
        )}
      </div>
      <VideoPlayer
        hlsUrl={hlsUrl}
        mp4Url={mp4Url}
        posterUrl={posterUrl}
        subtitleUrl={subtitleUrl}
        startAt={progress?.positionSeconds || 0}
        profileId={profileId}
        assetId={assetIdForProgress}
        titleId={title?.id || playable.id}
        episodeId={episode?.id || null}
      />
    </div>
  );
}
