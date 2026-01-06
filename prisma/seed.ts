import { PrismaClient, Role, TitleType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

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

  const allTitles = await prisma.title.findMany();

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
