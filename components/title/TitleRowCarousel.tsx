import TitleCard from "@/components/title/TitleCard";
import { Title } from "@prisma/client";

export default function TitleRowCarousel({
  label,
  titles,
  profileId
}: {
  label: string;
  titles: (Title & { posterAsset?: { pathOrUrl: string; storage: "LOCAL" | "S3" } | null })[];
  profileId: string | null;
}) {
  if (!titles.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">{label}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {titles.map((title) => (
          <TitleCard key={title.id} title={title} profileId={profileId} />
        ))}
      </div>
    </section>
  );
}
