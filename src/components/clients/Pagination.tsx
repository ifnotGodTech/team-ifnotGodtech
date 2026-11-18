import Link from "next/link";

type PaginationProps = { page: number; pageSize: number; total: number; query: string; withoutPlan?: boolean };

const hrefFor = (query: string, withoutPlan: boolean, page: number) => {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (withoutPlan) params.set("plan", "none");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/clients?${search}` : "/clients";
};

export function Pagination({ page, pageSize, total, query, withoutPlan = false }: PaginationProps) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {page > 1 && (
        <Link href={hrefFor(query, withoutPlan, page - 1)} className="font-semibold text-maroon underline">
          Previous page
        </Link>
      )}
      <span className="text-text-dim">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link href={hrefFor(query, withoutPlan, page + 1)} className="font-semibold text-maroon underline">
          Next page
        </Link>
      )}
    </nav>
  );
}
