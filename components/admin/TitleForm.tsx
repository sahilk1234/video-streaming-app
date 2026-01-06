"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type TitleFormProps = {
  titleId?: string;
  initial?: {
    name: string;
    type: "MOVIE" | "SERIES";
    description: string;
    year: number;
    runtimeMins?: number | null;
    maturityRating: string;
    rating?: number;
    genres?: string[];
    cast?: { name: string; roleName: string }[];
  };
  onSaved?: () => void;
};

export default function TitleForm({ titleId, initial, onSaved }: TitleFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<"MOVIE" | "SERIES">(initial?.type ?? "MOVIE");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [year, setYear] = useState(initial?.year?.toString() ?? "2024");
  const [runtime, setRuntime] = useState(initial?.runtimeMins?.toString() ?? "");
  const [maturityRating, setMaturityRating] = useState(initial?.maturityRating ?? "PG-13");
  const [rating, setRating] = useState(initial?.rating?.toString() ?? "7.5");
  const [genres, setGenres] = useState(initial?.genres?.join(", ") ?? "");
  const [cast, setCast] = useState(
    initial?.cast?.map((member) => `${member.name}:${member.roleName}`).join(", ") ?? ""
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const payload = {
      name,
      type,
      description,
      year: Number(year),
      runtimeMins: runtime ? Number(runtime) : null,
      maturityRating,
      rating: rating ? Number(rating) : 0,
      genres: genres
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      cast: cast
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const [namePart, rolePart] = item.split(":");
          return { name: namePart.trim(), roleName: (rolePart || "Cast").trim() };
        })
    };

    const response = await fetch(titleId ? `/api/titles/${titleId}` : "/api/titles", {
      method: titleId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!response.ok) {
      toast.error("Failed to save title");
      return;
    }

    toast.success(titleId ? "Title updated" : "Title created");
    onSaved?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Title name</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onChange={(event) => setType(event.target.value as "MOVIE" | "SERIES")}>
            <option value="MOVIE">Movie</option>
            <option value="SERIES">Series</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Year</Label>
          <Input value={year} onChange={(event) => setYear(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Runtime (mins)</Label>
          <Input value={runtime} onChange={(event) => setRuntime(event.target.value)} placeholder="120" />
        </div>
        <div className="space-y-2">
          <Label>Maturity rating</Label>
          <Input
            value={maturityRating}
            onChange={(event) => setMaturityRating(event.target.value)}
            placeholder="PG-13"
          />
        </div>
        <div className="space-y-2">
          <Label>Rating</Label>
          <Input value={rating} onChange={(event) => setRating(event.target.value)} placeholder="8.5" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} required />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Genres (comma separated)</Label>
          <Input value={genres} onChange={(event) => setGenres(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Cast (Name:Role, comma separated)</Label>
          <Input value={cast} onChange={(event) => setCast(event.target.value)} />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : titleId ? "Update Title" : "Create Title"}
      </Button>
    </form>
  );
}
