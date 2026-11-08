import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

export type Column<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  align?: "left" | "right";
  nowrap?: boolean;
};

type DataTableProps<Row> = {
  label: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Shown in place of the table when there are no rows. */
  empty: ReactNode;
};

/** A table that scrolls inside its own box on narrow screens, so the page never scrolls sideways. */
export function DataTable<Row>({ label, columns, rows, rowKey, empty }: DataTableProps<Row>) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-[10px] border border-line bg-card px-5 pb-3 pt-2">
      <table className="w-full min-w-[640px] border-collapse text-[0.94rem]">
        <thead>
          <tr className="text-left text-[0.81rem] text-text-dim">
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn("px-2.5 pb-2 pt-3 font-semibold first:pl-0 last:pr-0", column.align === "right" && "text-right")}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-line-soft">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn("px-2.5 py-3 first:pl-0 last:pr-0", column.align === "right" && "text-right", column.nowrap && "whitespace-nowrap")}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
