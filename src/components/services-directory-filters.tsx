"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

export function ServicesDirectoryFilters({
  defaultQ,
  defaultTown,
  townOptions,
  hasFilters,
}: {
  defaultQ: string;
  defaultTown: string;
  townOptions: SelectOption[];
  hasFilters: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [town, setTown] = useState(defaultTown);

  function submit() {
    const params = new URLSearchParams();
    const q = inputRef.current?.value.trim();
    if (q) params.set("q", q);
    if (town) params.set("town", town);
    router.push(`/services${params.size ? `?${params}` : ""}`);
  }

  return (
    <form
      className="practice-directory-filters"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="search-box">
        <Search size={17} />
        <span className="sr-only">Search practices and services</span>
        <input
          ref={inputRef}
          className="input"
          name="q"
          defaultValue={defaultQ}
          placeholder="Search practices or services"
        />
      </label>
      <CustomSelect
        ariaLabel="Filter by town"
        value={town}
        onChange={setTown}
        options={townOptions}
        placeholder="All towns"
      />
      <button type="submit" className="btn btn-primary">
        Search directory
      </button>
      {hasFilters && (
        <Link className="btn btn-light" href="/services">
          Clear filters
        </Link>
      )}
    </form>
  );
}
