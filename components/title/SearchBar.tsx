"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function SearchBar({ genres }: { genres: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [genre, setGenre] = useState(params.get("genre") || "");
  const [sort, setSort] = useState(params.get("sort") || "newest");

  const apply = () => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (genre) search.set("genre", genre);
    if (sort) search.set("sort", sort);
    router.push(`/search?${search.toString()}`);
  };

  return (
    <div className="glass rounded-3xl p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Input
          placeholder="Search by title"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="md:col-span-2"
        />
        <Select value={genre} onChange={(event) => setGenre(event.target.value)}>
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="newest">Newest</option>
          <option value="rating">Top rated</option>
        </Select>
      </div>
      <Button onClick={apply} className="mt-4">Search</Button>
    </div>
  );
}
