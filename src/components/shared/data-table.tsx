"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { SortDir } from "@/lib/mock/server";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, TableSkeleton } from "./empty-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  /** Cell renderer. Falls back to `String(row[key])` when omitted. */
  cell?: (row: T) => React.ReactNode;
  /** Value used for sorting; defaults to the raw field. */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  /** Hidden below the `lg` breakpoint on wide screens. */
  secondary?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
};

export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  /** Free-text search input. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: FilterDef[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  sort?: { key: string; dir: SortDir; onChange: (key: string, dir: SortDir) => void };
  pagination?: {
    page: number;
    pageCount: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  /**
   * Row selection. State is held internally unless `onChange` is supplied,
   * in which case the caller controls it.
   */
  selection?: {
    onChange?: (ids: string[]) => void;
    selected?: string[];
    label?: (row: T) => string;
  };
  /** Bulk action bar, shown when rows are selected. */
  bulkActions?: (ids: string[], clear: () => void) => React.ReactNode;
  /** Client-side CSV export of the current rows. */
  exportName?: string;
  empty?: { title: string; description?: string; action?: React.ReactNode };
  rowActions?: (row: T) => React.ReactNode;
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Extra content rendered above the toolbar (e.g. summary tabs). */
  toolbar?: React.ReactNode;
  className?: string;
};

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    rows,
    columns,
    rowKey,
    loading,
    error,
    search,
    filters = [],
    filterValues = {},
    onFilterChange,
    sort,
    pagination,
    selection,
    bulkActions,
    exportName,
    empty,
    rowActions,
    rowHref,
    onRowClick,
    toolbar,
    className,
  } = props;

  const [showFilters, setShowFilters] = useState(false);
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const activeFilters = filters.filter((f) => filterValues[f.key] && filterValues[f.key] !== "all");

  const selectedIds = selection?.selected ?? internalSelected;
  const setSelected = (ids: string[]) => {
    setInternalSelected(ids);
    selection?.onChange?.(ids);
  };
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allOnPageSelected = rows.length > 0 && rows.every((row) => selectedSet.has(rowKey(row)));

  const toggleAll = () => {
    if (!selection) return;
    setSelected(
      allOnPageSelected
        ? selectedIds.filter((id) => !rows.some((r) => rowKey(r) === id))
        : [...new Set([...selectedIds, ...rows.map(rowKey)])],
    );
  };

  const exportCsv = () => {
    if (!exportName) return;
    const header = columns.map((c) => c.header).join(",");
    const body = rows
      .map((row) =>
        columns
          .map((column) => {
            const raw = column.cell ? null : (row as Record<string, unknown>)[column.key];
            const value = column.cell ? columnHeaderFallback(row, column) : String(raw ?? "");
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    downloadCsv(`${exportName}.csv`, `${header}\n${body}`);
  };

  const showToolbar = !!(search || filters.length > 0 || exportName || selection);
  const caption = `${rows.length} row(s) shown${pagination ? ` of ${pagination.total}` : ""}`;

  return (
    <div className={cn("space-y-4", className)}>
      {showToolbar && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {search && (
              <div className="relative min-w-48 flex-1 sm:max-w-72">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                  placeholder={search.placeholder ?? "Search..."}
                  className="pl-8"
                  aria-label={search.placeholder ?? "Search"}
                />
              </div>
            )}

            {filters.map((filter) => (
              <div key={filter.key} className="w-full sm:w-44">
                <Select
                  value={filterValues[filter.key] ?? "all"}
                  onValueChange={(value) => onFilterChange?.(filter.key, String(value))}
                >
                  <SelectTrigger aria-label={filter.label} className="w-full">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {filter.label}</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {filters.length > 1 && (
              <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
                <SlidersHorizontal className="size-3.5" />
                {showFilters ? "Fewer" : "Filters"}
              </Button>
            )}

            {toolbar}
          </div>

          <div className="flex items-center gap-2">
            {exportName && (
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="size-3.5" />
                Export
              </Button>
            )}
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1">
              {filter.label}: {filter.options.find((o) => o.value === filterValues[filter.key])?.label ?? filterValues[filter.key]}
              <button
                type="button"
                aria-label={`Clear ${filter.label} filter`}
                onClick={() => onFilterChange?.(filter.key, "all")}
                className="hover:bg-background/60 rounded-full"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => filters.forEach((f) => onFilterChange?.(f.key, "all"))}>
            Clear all
          </Button>
        </div>
      )}

      {selection && bulkActions && selectedIds.length > 0 && (
        <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          {bulkActions(selectedIds, () => setSelected([]))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border">
        <Table aria-rowcount={pagination?.total ?? rows.length}>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {selection && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(column.secondary && "hidden lg:table-cell", column.align === "right" && "text-right", column.align === "center" && "text-center", column.className)}
                >
                  {column.sortable && sort ? (
                    <button
                      type="button"
                      onClick={() =>
                        sort.onChange(column.key, sort.key === column.key && sort.dir === "asc" ? "desc" : "asc")
                      }
                      className="hover:text-foreground inline-flex items-center gap-1 font-medium"
                    >
                      {column.header}
                      <ChevronsUpDown className="size-3" />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selection ? 1 : 0) + (rowActions ? 1 : 0)} className="p-4">
                  <TableSkeleton rows={6} cols={Math.min(columns.length, 5)} />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selection ? 1 : 0) + (rowActions ? 1 : 0)} className="p-6 text-center">
                  <p className="text-destructive text-sm">{error}</p>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selection ? 1 : 0) + (rowActions ? 1 : 0)} className="p-0">
                  <EmptyState
                    className="rounded-none border-0 shadow-none"
                    title={empty?.title ?? "No records found"}
                    description={empty?.description}
                    action={empty?.action}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const id = rowKey(row);
                return (
                  <TableRow
                    key={id}
                    className={cn(onRowClick && "cursor-pointer", selectedSet.has(id) && "bg-muted/40")}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selection && (
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedSet.has(id)}
                          onCheckedChange={(checked) =>
                            setSelected(checked ? [...selectedIds, id] : selectedIds.filter((s) => s !== id))
                          }
                          aria-label={`Select ${selection.label?.(row) ?? "row"}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(column.secondary && "hidden lg:table-cell", column.align === "right" && "text-right", column.align === "center" && "text-center")}
                        onClick={onRowClick || rowHref ? undefined : (event) => event.stopPropagation()}
                      >
                        {column.cell ? column.cell(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                      </TableCell>
                    ))}
                    {rowActions && (
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        {rowActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row" role="status">
          <p className="text-muted-foreground" aria-live="polite">
            Page {pagination.page} of {pagination.pageCount} · {pagination.total} records
          </p>
          <div className="flex items-center gap-2">
            {pagination.onPageSizeChange && (
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(value) => pagination.onPageSizeChange?.(Number(value))}
              >
                <SelectTrigger className="w-24" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} rows
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pageCount}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders a cell's text content for CSV export. */
function columnHeaderFallback<T>(row: T, column: Column<T>): React.ReactNode {
  const rendered = column.cell?.(row);
  if (typeof rendered === "string" || typeof rendered === "number") return rendered;
  if (column.sortValue) return column.sortValue(row);
  const raw = (row as Record<string, unknown>)[column.key];
  return raw === undefined || raw === null ? "" : String(raw);
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}