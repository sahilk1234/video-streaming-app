import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const profileSchema = z.object({
  name: z.string().min(1),
  avatar: z.string().min(1),
  isKids: z.boolean().optional().default(false)
});

export const titleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["MOVIE", "SERIES"]),
  description: z.string().min(10),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  runtimeMins: z.number().int().positive().optional().nullable(),
  maturityRating: z.string().min(1),
  rating: z.number().min(0).max(10).optional().default(0),
  genres: z.array(z.string().min(1)).optional().default([]),
  cast: z
    .array(
      z.object({
        name: z.string().min(1),
        roleName: z.string().min(1)
      })
    )
    .optional()
    .default([])
});

export const seasonSchema = z.object({
  titleId: z.string().min(1),
  seasonNumber: z.number().int().positive(),
  name: z.string().min(1)
});

export const episodeSchema = z.object({
  seasonId: z.string().min(1),
  episodeNumber: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().min(10),
  runtimeMins: z.number().int().positive().optional().nullable()
});

export const progressSchema = z.object({
  profileId: z.string().min(1),
  assetId: z.string().min(1),
  titleId: z.string().optional().nullable(),
  episodeId: z.string().optional().nullable(),
  positionSeconds: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative()
});

export const watchlistSchema = z.object({
  profileId: z.string().min(1),
  titleId: z.string().min(1)
});

export const searchSchema = z.object({
  q: z.string().optional(),
  genre: z.string().optional(),
  sort: z.enum(["newest", "rating"]).optional()
});
