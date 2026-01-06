import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import WatchlistButton from "@/components/title/WatchlistButton";
import { getAssetUrl } from "@/lib/storage";
import { Title } from "@prisma/client";

type TitleCardProps = {
  title: Title & {
    posterAsset?: { pathOrUrl: string; storage: "LOCAL" | "S3" } | null;
  };
  profileId: string | null;
  showActions?: boolean;
};

export default function TitleCard({ title, profileId, showActions = true }: TitleCardProps) {
  const posterUrl = title.posterAsset ? getAssetUrl(title.posterAsset as any) : null;

  return (
    <div className="group relative w-56 flex-shrink-0">
      <Link
        href={`/title/${title.id}`}
        className="block overflow-hidden rounded-3xl border border-border/60 bg-surface/60"
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title.name}
            className="h-72 w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-surface via-background to-surface text-center text-sm text-muted">
            {title.name}
          </div>
        )}
      </Link>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text truncate">{title.name}</h3>
          <Badge>{title.maturityRating}</Badge>
        </div>
        <div className="text-xs text-muted">{title.year}</div>
        {showActions && (
          <div className="space-y-2">
            <Link
              href={`/watch/${title.id}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
            >
              Play
            </Link>
            <WatchlistButton titleId={title.id} profileId={profileId} />
          </div>
        )}
      </div>
    </div>
  );
}
