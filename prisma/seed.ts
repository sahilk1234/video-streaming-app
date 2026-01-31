import { AssetKind, PrismaClient, Role, StorageProvider, TitleType } from "@prisma/client";
import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";
import { getStorageProvider as getConfiguredStorage, saveFile } from "../lib/storage";

const prisma = new PrismaClient();
const configuredStorage = getConfiguredStorage();

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

async function getLocalDemoPaths({
  prefixes,
  extension,
  strictPrefixes = false
}: {
  prefixes: string[];
  extension: string;
  strictPrefixes?: boolean;
}) {
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

    return strictPrefixes ? [] : files.sort().map((name) => `demos/${name}`);
  } catch {
    return [];
  }
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

  const demoVideoPaths = await getLocalDemoPaths({
    prefixes: ["open-"],
    extension: ".mp4",
    strictPrefixes: true
  });
  if (!demoVideoPaths.length) {
    console.warn("No demo videos found. Run `npm run demo:videos` and re-run the seed.");
  }

  const demoPosterPaths = await getLocalDemoPaths({
    prefixes: ["open-poster-"],
    extension: ".jpg",
    strictPrefixes: true
  });
  if (!demoPosterPaths.length) {
    console.warn("No demo posters found. Run `npm run demo:videos` and re-run the seed.");
  }

  const demoBackdropPaths = await getLocalDemoPaths({
    prefixes: ["open-backdrop-"],
    extension: ".jpg",
    strictPrefixes: true
  });
  if (!demoBackdropPaths.length) {
    console.warn("No demo backdrops found. Run `npm run demo:videos` and re-run the seed.");
  }

  const demoSubtitlePaths = await getLocalDemoPaths({
    prefixes: ["open-subtitle-"],
    extension: ".vtt",
    strictPrefixes: true
  });
  if (!demoSubtitlePaths.length) {
    console.warn("No demo subtitles found. Skipping subtitle assets.");
  }

  let videoIndex = 0;
  let posterIndex = 0;
  let backdropIndex = 0;
  let subtitleIndex = 0;

  if (demoVideoPaths.length) {
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
  }

  if (demoPosterPaths.length) {
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
  }

  if (demoBackdropPaths.length) {
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
  }

  if (demoSubtitlePaths.length) {
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
  }

  const episodesNeedingVideo = await prisma.episode.findMany({
    include: { videoAsset: true, subtitleAsset: true }
  });
  if (demoVideoPaths.length) {
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
  }

  if (demoSubtitlePaths.length) {
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
