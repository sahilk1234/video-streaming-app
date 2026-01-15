import { AssetKind, PrismaClient, Role, StorageProvider, TitleType } from "@prisma/client";
import bcrypt from "bcrypt";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { getStorageProvider as getConfiguredStorage, saveFile } from "../lib/storage";

const prisma = new PrismaClient();
const configuredStorage = getConfiguredStorage();

const demoVideoSources = [
  "testsrc=size=640x360:rate=24",
  "testsrc2=size=640x360:rate=24",
  "smptebars=size=640x360:rate=24",
  "rgbtest=size=640x360:rate=24",
  "color=c=0x0ea5e9:s=640x360:r=24",
  "color=c=0x22c55e:s=640x360:r=24",
  "color=c=0xf97316:s=640x360:r=24",
  "color=c=0xeab308:s=640x360:r=24",
  "color=c=0x0f172a:s=640x360:r=24",
  "color=c=0xdc2626:s=640x360:r=24",
  "color=c=0x14b8a6:s=640x360:r=24",
  "color=c=0xec4899:s=640x360:r=24",
  "color=c=0x84cc16:s=640x360:r=24",
  "color=c=0x6366f1:s=640x360:r=24",
  "color=c=0x3b82f6:s=640x360:r=24"
];
const demoVideoCount = 15;
const demoImageCount = 15;
const demoSubtitleCount = 15;
const demoVideoDurationSeconds = 12;
const demoImageColors = [
  "0x0ea5e9",
  "0x22c55e",
  "0xf97316",
  "0xeab308",
  "0x0f172a",
  "0xdc2626",
  "0x14b8a6",
  "0xec4899",
  "0x84cc16",
  "0x6366f1",
  "0x3b82f6",
  "0x8b5cf6",
  "0x06b6d4",
  "0xf43f5e",
  "0x10b981"
];

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runFfmpeg(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

function normalizeRelativePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function mapStorageProvider(storage: string): StorageProvider {
  return storage === "s3" ? StorageProvider.S3 : StorageProvider.LOCAL;
}

async function storeDemoAsset(relativePath: string, mimeType: string) {
  const normalized = normalizeRelativePath(relativePath);
  if (configuredStorage !== "s3") {
    return { path: normalized, storage: StorageProvider.LOCAL };
  }

  const baseDir = process.env.LOCAL_MEDIA_DIR || "./storage";
  const absolutePath = path.resolve(baseDir, normalized);
  const data = await fs.readFile(absolutePath);
  const stored = await saveFile({
    data,
    filename: path.posix.basename(normalized),
    mimeType,
    folder: "",
    relativePath: normalized
  });

  return { path: stored.path, storage: mapStorageProvider(stored.storage) };
}

async function ensureDummyVideos(count: number) {
  const baseDir = process.env.LOCAL_MEDIA_DIR || "./storage";
  const relativePaths: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const relativePath = `demos/demo-${String(index + 1).padStart(2, "0")}.mp4`;
    const absolutePath = path.resolve(baseDir, relativePath);

    if (!(await fileExists(absolutePath))) {
      const source = demoVideoSources[index % demoVideoSources.length];
      const frequency = 440 + index * 40;

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await runFfmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        source,
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frequency}:sample_rate=44100`,
        "-t",
        `${demoVideoDurationSeconds}`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        "-shortest",
        absolutePath
      ]);
    }

    relativePaths.push(relativePath);
  }

  return relativePaths;
}

async function getLocalDemoPaths({ prefixes, extension }: { prefixes: string[]; extension: string }) {
  const baseDir = process.env.LOCAL_MEDIA_DIR || "./storage";
  const demoDir = path.resolve(baseDir, "demos");

  try {
    const entries = await fs.readdir(demoDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(extension));

    if (!files.length) {
      return [];
    }

    for (const prefix of prefixes) {
      const matches = files.filter((name) => name.startsWith(prefix)).sort();
      if (matches.length) {
        return matches.map((name) => `demos/${name}`);
      }
    }

    return files.sort().map((name) => `demos/${name}`);
  } catch {
    return [];
  }
}

async function ensureDummyImages({
  count,
  prefix,
  width,
  height
}: {
  count: number;
  prefix: string;
  width: number;
  height: number;
}) {
  const baseDir = process.env.LOCAL_MEDIA_DIR || "./storage";
  const relativePaths: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const relativePath = `demos/${prefix}-${String(index + 1).padStart(2, "0")}.jpg`;
    const absolutePath = path.resolve(baseDir, relativePath);

    if (!(await fileExists(absolutePath))) {
      const color = demoImageColors[index % demoImageColors.length];
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await runFfmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=${color}:s=${width}x${height}`,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        absolutePath
      ]);
    }

    relativePaths.push(relativePath);
  }

  return relativePaths;
}

async function ensureDummySubtitles(count: number) {
  const baseDir = process.env.LOCAL_MEDIA_DIR || "./storage";
  const relativePaths: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const relativePath = `demos/subtitle-${String(index + 1).padStart(2, "0")}.vtt`;
    const absolutePath = path.resolve(baseDir, relativePath);

    if (!(await fileExists(absolutePath))) {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      const cueOffset = index + 1;
      const vtt = [
        "WEBVTT",
        "",
        "00:00:00.000 --> 00:00:03.500",
        `Sample subtitle ${cueOffset}.`,
        "",
        "00:00:03.500 --> 00:00:07.000",
        "This is a demo caption line.",
        "",
        "00:00:07.000 --> 00:00:11.000",
        "Thanks for watching."
      ].join("\n");
      await fs.writeFile(absolutePath, vtt);
    }

    relativePaths.push(relativePath);
  }

  return relativePaths;
}

async function main() {
  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const userPassword = await bcrypt.hash("User@12345", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: adminPassword,
      role: Role.ADMIN
    }
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      passwordHash: userPassword,
      role: Role.USER
    }
  });

  await prisma.profile.upsert({
    where: { id: "demo-main-profile" },
    update: {},
    create: {
      id: "demo-main-profile",
      userId: demoUser.id,
      name: "Alex",
      avatar: "AX",
      isKids: false
    }
  });

  await prisma.profile.upsert({
    where: { id: "demo-kids-profile" },
    update: {},
    create: {
      id: "demo-kids-profile",
      userId: demoUser.id,
      name: "Nova",
      avatar: "NV",
      isKids: true
    }
  });

  const genres = ["Action", "Drama", "Sci-Fi", "Comedy", "Thriller", "Animation"];
  const genreRecords = await Promise.all(
    genres.map((name) =>
      prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const titles = await prisma.title.createMany({
    data: [
      {
        name: "Glass Orbit",
        type: TitleType.MOVIE,
        description: "A rogue navigator uncovers a conspiracy hidden in the rings of Saturn.",
        year: 2024,
        runtimeMins: 121,
        maturityRating: "PG-13",
        rating: 8.4
      },
      {
        name: "Neon Vale",
        type: TitleType.MOVIE,
        description: "A detective hunts a memory thief in a city built on neon rain.",
        year: 2023,
        runtimeMins: 109,
        maturityRating: "R",
        rating: 7.9
      },
      {
        name: "Northbound",
        type: TitleType.SERIES,
        description: "A survival engineer and her crew rebuild society after a polar blackout.",
        year: 2022,
        runtimeMins: 48,
        maturityRating: "TV-14",
        rating: 8.1
      },
      {
        name: "Moonlit Kitchen",
        type: TitleType.SERIES,
        description: "A midnight pop-up kitchen becomes a portal to strange futures.",
        year: 2021,
        runtimeMins: 42,
        maturityRating: "TV-14",
        rating: 7.4
      }
    ],
    skipDuplicates: true
  });

  const allTitles = await prisma.title.findMany({
    include: { videoAsset: true, posterAsset: true, backdropAsset: true, subtitleAsset: true }
  });

  for (const title of allTitles) {
    await prisma.titleGenre.createMany({
      data: [
        { titleId: title.id, genreId: genreRecords[Math.floor(Math.random() * genreRecords.length)].id },
        { titleId: title.id, genreId: genreRecords[Math.floor(Math.random() * genreRecords.length)].id }
      ],
      skipDuplicates: true
    });

    await prisma.titlePerson.createMany({
      data: [
        {
          titleId: title.id,
          personId: (
            await prisma.person.upsert({
              where: { name: "Jordan Lee" },
              update: {},
              create: { name: "Jordan Lee" }
            })
          ).id,
          roleName: "Director"
        },
        {
          titleId: title.id,
          personId: (
            await prisma.person.upsert({
              where: { name: "Samira Grey" },
              update: {},
              create: { name: "Samira Grey" }
            })
          ).id,
          roleName: "Lead"
        }
      ],
      skipDuplicates: true
    });
  }

  const series = allTitles.filter((title) => title.type === TitleType.SERIES);
  for (const show of series) {
    const season = await prisma.season.create({
      data: {
        titleId: show.id,
        seasonNumber: 1,
        name: "Season 1"
      }
    });

    await prisma.episode.createMany({
      data: [
        {
          seasonId: season.id,
          episodeNumber: 1,
          name: "Pilot",
          description: "The crew assembles for their first mission.",
          runtimeMins: 45
        },
        {
          seasonId: season.id,
          episodeNumber: 2,
          name: "Afterglow",
          description: "New alliances form in the wake of a blackout.",
          runtimeMins: 47
        }
      ]
    });
  }

  let demoVideoPaths = await getLocalDemoPaths({ prefixes: ["open-", "demo-"], extension: ".mp4" });
  if (!demoVideoPaths.length) {
    demoVideoPaths = await ensureDummyVideos(demoVideoCount);
  }
  let demoPosterPaths = await getLocalDemoPaths({ prefixes: ["open-poster-", "poster-"], extension: ".jpg" });
  if (!demoPosterPaths.length) {
    demoPosterPaths = await ensureDummyImages({
      count: demoImageCount,
      prefix: "poster",
      width: 600,
      height: 900
    });
  }
  let demoBackdropPaths = await getLocalDemoPaths({ prefixes: ["open-backdrop-", "backdrop-"], extension: ".jpg" });
  if (!demoBackdropPaths.length) {
    demoBackdropPaths = await ensureDummyImages({
      count: demoImageCount,
      prefix: "backdrop",
      width: 1280,
      height: 720
    });
  }
  let demoSubtitlePaths = await getLocalDemoPaths({ prefixes: ["open-subtitle-", "subtitle-"], extension: ".vtt" });
  if (!demoSubtitlePaths.length) {
    demoSubtitlePaths = await ensureDummySubtitles(demoSubtitleCount);
  }

  let videoIndex = 0;
  let posterIndex = 0;
  let backdropIndex = 0;
  let subtitleIndex = 0;

  const titlesNeedingVideo = allTitles.filter((title) => {
    if (!title.videoAsset) {
      return true;
    }
    return title.videoAsset.kind === AssetKind.VIDEO_MP4 && title.videoAsset.pathOrUrl.startsWith("demos/");
  });
  for (const title of titlesNeedingVideo) {
    const videoPath = demoVideoPaths[videoIndex % demoVideoPaths.length];
    videoIndex += 1;
    const stored = await storeDemoAsset(videoPath, "video/mp4");
    const asset = await prisma.asset.create({
      data: {
        kind: AssetKind.VIDEO_MP4,
        storage: stored.storage,
        pathOrUrl: stored.path
      }
    });

    await prisma.title.update({
      where: { id: title.id },
      data: { videoAssetId: asset.id }
    });
  }

  const titlesNeedingPoster = allTitles.filter((title) => {
    if (!title.posterAsset) {
      return true;
    }
    return title.posterAsset.kind === AssetKind.POSTER && title.posterAsset.pathOrUrl.startsWith("demos/");
  });
  for (const title of titlesNeedingPoster) {
    const posterPath = demoPosterPaths[posterIndex % demoPosterPaths.length];
    posterIndex += 1;
    const stored = await storeDemoAsset(posterPath, "image/jpeg");
    const asset = await prisma.asset.create({
      data: {
        kind: AssetKind.POSTER,
        storage: stored.storage,
        pathOrUrl: stored.path
      }
    });

    await prisma.title.update({
      where: { id: title.id },
      data: { posterAssetId: asset.id }
    });
  }

  const titlesNeedingBackdrop = allTitles.filter((title) => {
    if (!title.backdropAsset) {
      return true;
    }
    return title.backdropAsset.kind === AssetKind.BACKDROP && title.backdropAsset.pathOrUrl.startsWith("demos/");
  });
  for (const title of titlesNeedingBackdrop) {
    const backdropPath = demoBackdropPaths[backdropIndex % demoBackdropPaths.length];
    backdropIndex += 1;
    const stored = await storeDemoAsset(backdropPath, "image/jpeg");
    const asset = await prisma.asset.create({
      data: {
        kind: AssetKind.BACKDROP,
        storage: stored.storage,
        pathOrUrl: stored.path
      }
    });

    await prisma.title.update({
      where: { id: title.id },
      data: { backdropAssetId: asset.id }
    });
  }

  const titlesNeedingSubtitle = allTitles.filter((title) => {
    if (!title.subtitleAsset) {
      return true;
    }
    return title.subtitleAsset.kind === AssetKind.SUBTITLE_VTT && title.subtitleAsset.pathOrUrl.startsWith("demos/");
  });
  for (const title of titlesNeedingSubtitle) {
    const subtitlePath = demoSubtitlePaths[subtitleIndex % demoSubtitlePaths.length];
    subtitleIndex += 1;
    const stored = await storeDemoAsset(subtitlePath, "text/vtt");
    const asset = await prisma.asset.create({
      data: {
        kind: AssetKind.SUBTITLE_VTT,
        storage: stored.storage,
        pathOrUrl: stored.path
      }
    });

    await prisma.title.update({
      where: { id: title.id },
      data: { subtitleAssetId: asset.id }
    });
  }

  const episodesNeedingVideo = await prisma.episode.findMany({
    include: { videoAsset: true, subtitleAsset: true }
  });
  const episodesToSeed = episodesNeedingVideo.filter((episode) => {
    if (!episode.videoAsset) {
      return true;
    }
    return episode.videoAsset.kind === AssetKind.VIDEO_MP4 && episode.videoAsset.pathOrUrl.startsWith("demos/");
  });

  for (const episode of episodesToSeed) {
    const videoPath = demoVideoPaths[videoIndex % demoVideoPaths.length];
    videoIndex += 1;
    const stored = await storeDemoAsset(videoPath, "video/mp4");
    const asset = await prisma.asset.create({
      data: {
        kind: AssetKind.VIDEO_MP4,
        storage: stored.storage,
        pathOrUrl: stored.path
      }
    });

    await prisma.episode.update({
      where: { id: episode.id },
      data: { videoAssetId: asset.id }
    });
  }

  const episodesNeedingSubtitle = episodesNeedingVideo.filter((episode) => {
    if (!episode.subtitleAsset) {
      return true;
    }
    return episode.subtitleAsset.kind === AssetKind.SUBTITLE_VTT && episode.subtitleAsset.pathOrUrl.startsWith("demos/");
  });

  for (const episode of episodesNeedingSubtitle) {
    const subtitlePath = demoSubtitlePaths[subtitleIndex % demoSubtitlePaths.length];
    subtitleIndex += 1;
    const stored = await storeDemoAsset(subtitlePath, "text/vtt");
    const asset = await prisma.asset.create({
      data: {
        kind: AssetKind.SUBTITLE_VTT,
        storage: stored.storage,
        pathOrUrl: stored.path
      }
    });

    await prisma.episode.update({
      where: { id: episode.id },
      data: { subtitleAssetId: asset.id }
    });
  }

  console.log("Seeded admin user:", admin.email);
  console.log("Seeded demo user:", demoUser.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
