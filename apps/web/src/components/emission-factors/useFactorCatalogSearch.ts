import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  api,
  type FactorCatalogFacetsResponse,
  type FactorCatalogSearchItem,
  type FactorCatalogSearchParams,
} from "@/integrations/api/client";

const DEBOUNCE_MS = 300;

export type CatalogFilters = {
  q: string;
  source: string;
  internal_category: string;
  country_code: string;
  factor_type: string;
  internal_subcategory: string;
  region: string;
  unit_denominator: string;
  factor_year: string;
  dataset_version: string;
};

const EMPTY_FILTERS: CatalogFilters = {
  q: "",
  source: "",
  internal_category: "",
  country_code: "",
  factor_type: "",
  internal_subcategory: "",
  region: "",
  unit_denominator: "",
  factor_year: "",
  dataset_version: "",
};

function filtersFromParams(sp: URLSearchParams): CatalogFilters {
  return {
    q: sp.get("q") ?? "",
    source: sp.get("source") ?? "",
    internal_category: sp.get("category") ?? "",
    country_code: sp.get("country") ?? "",
    factor_type: sp.get("type") ?? "",
    internal_subcategory: sp.get("subcategory") ?? "",
    region: sp.get("region") ?? "",
    unit_denominator: sp.get("unit") ?? "",
    factor_year: sp.get("year") ?? "",
    dataset_version: sp.get("dataset") ?? "",
  };
}

function paramsFromFilters(f: CatalogFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.source) sp.set("source", f.source);
  if (f.internal_category) sp.set("category", f.internal_category);
  if (f.country_code) sp.set("country", f.country_code);
  if (f.factor_type) sp.set("type", f.factor_type);
  if (f.internal_subcategory) sp.set("subcategory", f.internal_subcategory);
  if (f.region) sp.set("region", f.region);
  if (f.unit_denominator) sp.set("unit", f.unit_denominator);
  if (f.factor_year) sp.set("year", f.factor_year);
  if (f.dataset_version) sp.set("dataset", f.dataset_version);
  return sp;
}

function toApiParams(f: CatalogFilters, cursor?: string): FactorCatalogSearchParams {
  const year = f.factor_year ? Number(f.factor_year) : undefined;
  return {
    q: f.q || undefined,
    source: f.source || undefined,
    internal_category: f.internal_category || undefined,
    country_code: f.country_code || undefined,
    factor_type: f.factor_type || undefined,
    internal_subcategory: f.internal_subcategory || undefined,
    region: f.region || undefined,
    unit_denominator: f.unit_denominator || undefined,
    factor_year: Number.isFinite(year) ? year : undefined,
    dataset_version: f.dataset_version || undefined,
    status: "approved",
    limit: 20,
    cursor,
  };
}

function filtersEqual(a: CatalogFilters, b: CatalogFilters): boolean {
  return (Object.keys(EMPTY_FILTERS) as Array<keyof CatalogFilters>).every(
    (k) => a[k] === b[k],
  );
}

export function useFactorCatalogSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<CatalogFilters>(() =>
    filtersFromParams(searchParams),
  );
  const [debounced, setDebounced] = useState(filters);
  const [items, setItems] = useState<FactorCatalogSearchItem[]>([]);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<FactorCatalogFacetsResponse | null>(null);
  const [facetsLoading, setFacetsLoading] = useState(false);

  const searchGen = useRef(0);
  const facetsKeyRef = useRef("");
  const writingUrlRef = useRef(false);

  // Sync URL → local on browser back/forward (ignore our own URL writes)
  useEffect(() => {
    if (writingUrlRef.current) return;
    const fromUrl = filtersFromParams(searchParams);
    setFiltersState((prev) => (filtersEqual(prev, fromUrl) ? prev : fromUrl));
  }, [searchParams]);

  // Debounce for API + URL
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(filters), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [filters]);

  // Write filters to URL (replace to avoid history spam on typing)
  useEffect(() => {
    const next = paramsFromFilters(debounced);
    const cur = searchParams.toString();
    if (next.toString() === cur) return;
    writingUrlRef.current = true;
    setSearchParams(next, { replace: true });
    queueMicrotask(() => {
      writingUrlRef.current = false;
    });
  }, [debounced, searchParams, setSearchParams]);

  // New search/filters → page 1 + reset cursor history (no page in URL)
  useEffect(() => {
    setPageIndex(0);
    setCursorStack([null]);
    setNextCursor(null);
    setHasMore(false);
  }, [debounced]);

  const setFilter = useCallback(<K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((patch: Partial<CatalogFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(EMPTY_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(
    () => !filtersEqual(filters, EMPTY_FILTERS),
    [filters],
  );

  // Facets: load when non-q filters change (not on every keystroke of q)
  const facetFilters = useMemo(() => {
    const { q: _q, ...rest } = debounced;
    return rest;
  }, [debounced]);

  useEffect(() => {
    const key = JSON.stringify(facetFilters);
    if (key === facetsKeyRef.current) return;
    facetsKeyRef.current = key;
    let cancelled = false;
    setFacetsLoading(true);
    api
      .getEmissionFactorFacets(toApiParams({ ...EMPTY_FILTERS, ...facetFilters, q: "" }))
      .then((res) => {
        if (!cancelled) setFacets(res);
      })
      .catch(() => {
        if (!cancelled) setFacets(null);
      })
      .finally(() => {
        if (!cancelled) setFacetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facetFilters]);

  // Search pages
  useEffect(() => {
    const gen = ++searchGen.current;
    const cursor = cursorStack[pageIndex] ?? null;
    setLoading(true);
    setError(null);
    api
      .searchEmissionFactors(toApiParams(debounced, cursor ?? undefined))
      .then((res) => {
        if (gen !== searchGen.current) return;
        setItems(res.items);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
        setTotal(typeof res.total === "number" ? res.total : res.items.length);
      })
      .catch((err: unknown) => {
        if (gen !== searchGen.current) return;
        setItems([]);
        setNextCursor(null);
        setHasMore(false);
        setTotal(0);
        setError(err instanceof Error ? err.message : "error");
      })
      .finally(() => {
        if (gen === searchGen.current) setLoading(false);
      });
  }, [debounced, cursorStack, pageIndex]);

  const goNext = useCallback(() => {
    if (!hasMore || !nextCursor) return;
    setCursorStack((prev) => {
      const next = prev.slice(0, pageIndex + 1);
      next.push(nextCursor);
      return next;
    });
    setPageIndex((i) => i + 1);
  }, [hasMore, nextCursor, pageIndex]);

  const goPrev = useCallback(() => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, []);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    hasActiveFilters,
    items,
    loading,
    error,
    facets,
    facetsLoading,
    pageIndex,
    page: pageIndex + 1,
    total,
    hasMore,
    canPrev: pageIndex > 0,
    canNext: Boolean(hasMore && nextCursor),
    goNext,
    goPrev,
  };
}
