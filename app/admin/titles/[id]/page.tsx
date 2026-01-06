import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import TitleForm from "@/components/admin/TitleForm";
import UploadForm from "@/components/admin/UploadForm";
import SeasonForm from "@/components/admin/SeasonForm";
import EpisodeForm from "@/components/admin/EpisodeForm";
import { Badge } from "@/components/ui/badge";

export default async function AdminTitlePage({ params }: { params: { id: string } }) {
  const title = await prisma.title.findUnique({
    where: { id: params.id },
    include: {
      genres: { include: { genre: true } },
      people: { include: { person: true } },
      seasons: { include: { episodes: true }, orderBy: { seasonNumber: "asc" } },
      jobs: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!title) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <div>
        <h1 className="font-display text-4xl text-text">{title.name}</h1>
        <p className="text-muted">Edit metadata and manage media uploads.</p>
      </div>

      <section className="glass rounded-3xl p-8 space-y-6">
        <h2 className="text-xl font-semibold text-text">Title details</h2>
        <TitleForm
          titleId={title.id}
          initial={{
            name: title.name,
            type: title.type,
            description: title.description,
            year: title.year,
            runtimeMins: title.runtimeMins ?? undefined,
            maturityRating: title.maturityRating,
            rating: title.rating,
            genres: title.genres.map((g) => g.genre.name),
            cast: title.people.map((p) => ({ name: p.person.name, roleName: p.roleName }))
          }}
        />
      </section>

      <section className="glass rounded-3xl p-8 space-y-6">
        <h2 className="text-xl font-semibold text-text">Upload assets</h2>
        <UploadForm titleId={title.id} />
      </section>

      <section className="glass rounded-3xl p-8 space-y-4">
        <h2 className="text-xl font-semibold text-text">Processing status</h2>
        {title.jobs.length === 0 ? (
          <p className="text-sm text-muted">No media jobs yet.</p>
        ) : (
          <div className="space-y-3">
            {title.jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-text">{job.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted">{new Date(job.createdAt).toLocaleString()}</p>
                </div>
                <Badge>{job.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {title.type === "SERIES" && (
        <section className="space-y-6">
          <div className="glass rounded-3xl p-8 space-y-4">
            <h2 className="text-xl font-semibold text-text">Add season</h2>
            <SeasonForm titleId={title.id} />
          </div>

          {title.seasons.map((season) => (
            <div key={season.id} className="glass rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">{season.name}</h3>
                <Badge>Season {season.seasonNumber}</Badge>
              </div>
              <EpisodeForm seasonId={season.id} />
              <div className="space-y-4">
                {season.episodes.map((episode) => (
                  <div key={episode.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text">Episode {episode.episodeNumber}: {episode.name}</p>
                        <p className="text-xs text-muted">{episode.description}</p>
                      </div>
                      <Badge>{episode.videoAssetId ? "READY" : "UPLOAD"}</Badge>
                    </div>
                    <div className="mt-4">
                      <UploadForm episodeId={episode.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
