# Streaming app

A single Next.js App Router project with API route handlers, authentication, profiles, HLS playback, and an admin CMS for uploads.

## Prerequisites
- Node.js 20+
- Docker (for Postgres and optional MinIO)
- FFmpeg installed locally (`ffmpeg -version`)

## Tech stack
- Next.js App Router + TypeScript (strict)
- Prisma + PostgreSQL
- NextAuth (Credentials provider)
- TailwindCSS + custom UI primitives
- Zustand for client state
- Zod validation
- HLS playback via hls.js with MP4 fallback

## Environment variables
Copy `.env.example` to `.env` and adjust:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/streaming"
NEXTAUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
MEDIA_STORAGE="local"
LOCAL_MEDIA_DIR="./storage"
S3_ENDPOINT=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_BUCKET=""
S3_REGION="us-east-1"
```

## Run locally (Node + Docker for Postgres)
1. Start Postgres (and optional MinIO):
   ```bash
   docker compose up -d db minio
   ```
2. Install deps:
   ```bash
   npm install
   ```
3. Run migrations and seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

## Run everything with Docker Compose
```bash
docker compose up --build
```

## Seeded users
- Admin: `admin@example.com` / `Admin@12345`
- Demo user: `user@example.com` / `User@12345`

## Upload a demo video + generate HLS
1. Sign in as admin.
2. Create a movie or series under `/admin`.
3. For movies: open the title page and upload an MP4 (and optional poster/backdrop/VTT).
4. For series: create a season + episode, then upload the episode MP4.
5. Media jobs will show `PROCESSING` until HLS and thumbnail generation completes.

## Storage modes
- Local (default): files stored under `LOCAL_MEDIA_DIR` and served via `/api/media/*`.
- S3/MinIO: set `MEDIA_STORAGE=s3` and fill S3 env vars. Ensure the bucket exists (create `media` in MinIO).

## Useful commands
```bash
npm run dev
npm run build
npm run start
npm run db:migrate
npm run db:seed
```

## Notes
- Playback uses HLS when available; MP4 fallback is automatic.
- If you are running inside Docker, the container installs FFmpeg for processing.
