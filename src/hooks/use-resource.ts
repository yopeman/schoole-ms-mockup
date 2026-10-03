"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EntityName } from "@/lib/mock/seed";
import { db, type ListParams, type ListResult } from "@/lib/mock/server";

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, refresh };
}

export const useList = <T extends { id: string }>(entity: EntityName, params: ListParams = {}) => {
  const key = useMemo(() => JSON.stringify(params), [params]);
  return useAsync<ListResult<T>>(() => db.list<T>(entity, JSON.parse(key) as ListParams), [entity, key]);
};

export const useItem = <T extends { id: string }>(entity: EntityName, id: string | undefined) =>
  useAsync<T | null>(() => (id ? db.get<T>(entity, id) : Promise.resolve(null)), [entity, id]);

export function useMutation<T, I>(fn: (input: I) => Promise<T>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (input: I): Promise<T> => {
      setPending(true);
      setError(null);
      try {
        return await fn(input);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        setError(message);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );

  return { mutate, pending, error };
}

export const useCrud = <T extends { id: string }>(entity: EntityName) => ({
  create: (input: Omit<T, "id"> & { id?: string }) => db.create<T>(entity, input),
  update: (id: string, changes: Partial<T>) => db.update<T>(entity, id, changes),
  remove: (id: string) => db.remove(entity, id),
});