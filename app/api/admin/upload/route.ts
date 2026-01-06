import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/storage";
import { processMediaJob } from "@/lib/video/jobs";
import { AssetKind, MediaJobStatus, StorageProvider } from "@prisma/client";

export const runtime = "nodejs";

function mapStorageProvider(storage: string) {
  return storage === "s3" ? StorageProvider.S3 : StorageProvider.LOCAL;
}

async function saveAsset(file: File, kind: AssetKind, folder: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await saveFile({
    data: buffer,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    folder
  });

  return prisma.asset.create({
    data: {
      kind,
      storage: mapStorageProvider(stored.storage),
      pathOrUrl: stored.path,
      metaJson: {
        size: file.size,
        type: file.type
      }
    }
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const titleId = formData.get("titleId")?.toString() || null;
  const episodeId = formData.get("episodeId")?.toString() || null;

  if (!titleId && !episodeId) {
    return NextResponse.json({ error: "titleId or episodeId is required" }, { status: 400 });
  }

  if (titleId) {
    const title = await prisma.title.findUnique({ where: { id: titleId } });
    if (!title) {
      return NextResponse.json({ error: "Title not found" }, { status: 404 });
    }
  }

  if (episodeId) {
    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }
  }

  const poster = formData.get("poster") as File | null;
  const backdrop = formData.get("backdrop") as File | null;
  const subtitle = formData.get("subtitle") as File | null;
  const video = formData.get("video") as File | null;

  if (poster && titleId) {
    const asset = await saveAsset(poster, AssetKind.POSTER, "posters");
    await prisma.title.update({
      where: { id: titleId },
      data: { posterAssetId: asset.id }
    });
  }

  if (backdrop && titleId) {
    const asset = await saveAsset(backdrop, AssetKind.BACKDROP, "backdrops");
    await prisma.title.update({
      where: { id: titleId },
      data: { backdropAssetId: asset.id }
    });
  }

  if (subtitle) {
    const asset = await saveAsset(subtitle, AssetKind.SUBTITLE_VTT, "subtitles");
    if (titleId) {
      await prisma.title.update({
        where: { id: titleId },
        data: { subtitleAssetId: asset.id }
      });
    }
    if (episodeId) {
      await prisma.episode.update({
        where: { id: episodeId },
        data: { subtitleAssetId: asset.id }
      });
    }
  }

  if (video) {
    const inputAsset = await saveAsset(video, AssetKind.VIDEO_MP4, "uploads");

    const job = await prisma.mediaJob.create({
      data: {
        titleId,
        episodeId,
        status: MediaJobStatus.QUEUED,
        inputAssetId: inputAsset.id
      }
    });

    processMediaJob(job.id).catch((error) => {
      console.error("Media job failed", error);
    });

    return NextResponse.json({ jobId: job.id, status: job.status }, { status: 201 });
  }

  return NextResponse.json({ ok: true });
}
