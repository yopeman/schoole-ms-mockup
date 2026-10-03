"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EntityName } from "@/lib/mock/seed";
import { db, type SortDir } from "@/lib/mock/server";
import { useAsync } from "./use-resource";

export type TableState = {
  search: string;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: SortDir;
  filters: Record<string, string>;
};

/**
 * Binds a DataTable's toolbar/pagination state to the mock gateway.
 * Debounced search keeps the simulated latency from firing on every keystroke.
 */
export function useDataTable<T extends { id: string }>(
  entity: EntityName,
  options: { initialSort?: string; initialSortDir?: SortDir; initialFilters?: Record<string, string>; pageSize?: number } = {},
) {
  const [searchInput, setSearchInput] = useState("");
  const [state, setState] = useState<TableState>({
    search: "",
    page: 1,
    pageSize: options.pageSize ?? 20,
    sortKey: options.initialSort ?? "",
    sortDir: options.initialSortDir ?? "asc",
    filters: options.initialFilters ?? {},
  });

  // Debounce so the simulated gateway latency is not paid on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setState((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      page: state.page,
      pageSize: state.pageSize,
      search: state.search || undefined,
      sort: state.sortKey || undefined,
      sortDir: state.sortDir,
      filters: state.filters,
    }),
    [state],
  );

  const query = useAsync(() => db.list<T>(entity, params), [JSON.stringify(params)]);

  const patch = useCallback((next: Partial<TableState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  return {
    ...query,
    data: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    pageCount: query.data?.pageCount ?? 1,
    state,
    setSearch: setSearchInput,
    setPage: (page: number) => patch({ page }),
    setPageSize: (pageSize: number) => patch({ pageSize, page: 1 }),
    setSort: (sortKey: string, sortDir: SortDir) => patch({ sortKey, sortDir, page: 1 }),
    setFilter: (key: string, value: string) =>
      setState((prev) => {
        const filters = { ...prev.filters };
        if (!value || value === "all") delete filters[key];
        else filters[key] = value;
        return { ...prev, filters, page: 1 };
      }),
  };
}