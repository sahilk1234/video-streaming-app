import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function AdminPage() {
  const [titles, jobs] = await Promise.all([
    prisma.title.findMany({
      include: { posterAsset: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.mediaJob.findMany({
      include: { title: true, episode: true },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-text">Admin dashboard</h1>
          <p className="text-muted">Manage titles, uploads, and media jobs.</p>
        </div>
        <Link
          href="/admin/titles/new"
          className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground"
        >
          New title
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">Titles</h2>
        <div className="grid gap-4">
          {titles.map((title) => (
            <Link
              key={title.id}
              href={`/admin/titles/${title.id}`}
              className="glass flex items-center justify-between rounded-2xl px-5 py-4"
            >
              <div>
                <p className="text-sm font-semibold text-text">{title.name}</p>
                <p className="text-xs text-muted">{title.type} - {title.year}</p>
              </div>
              <Badge>{title.maturityRating}</Badge>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">Recent media jobs</h2>
        <div className="grid gap-3">
          {jobs.map((job) => (
            <div key={job.id} className="glass flex items-center justify-between rounded-2xl px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-text">
                  {job.title?.name || job.episode?.name || "Unknown asset"}
                </p>
                <p className="text-xs text-muted">{job.status}</p>
              </div>
              <Badge>{job.status}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
