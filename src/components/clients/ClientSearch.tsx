import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

/** A plain GET form, so search works without JavaScript and results can be bookmarked. */
export function ClientSearch({ query }: { query: string }) {
  return (
    <form action="/clients" role="search" className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 grow basis-72 flex-col gap-1.5 sm:max-w-md">
        <label htmlFor="q" className="text-[0.94rem] font-semibold">
          Search by name, business or email
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          className="min-h-11 w-full rounded-md border border-field bg-card px-3 py-2.5 text-base text-text"
        />
      </div>
      <button type="submit" className={buttonClasses("primary")}>
        Search
      </button>
      {query && (
        <Link href="/clients" className="min-h-11 content-center font-semibold text-maroon underline">
          Clear search
        </Link>
      )}
    </form>
  );
}
