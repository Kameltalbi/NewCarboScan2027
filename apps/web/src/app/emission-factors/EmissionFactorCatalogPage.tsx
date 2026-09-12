import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FactorCatalogFilters } from "@/components/emission-factors/FactorCatalogFilters";
import {
  FactorCatalogMobileList,
  FactorCatalogTable,
} from "@/components/emission-factors/FactorCatalogTable";
import { FactorDataSourcesTable } from "@/components/emission-factors/FactorDataSourcesTable";
import { FactorDetailSheet } from "@/components/emission-factors/FactorDetailSheet";
import { useFactorCatalogSearch } from "@/components/emission-factors/useFactorCatalogSearch";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function EmissionFactorCatalogPage() {
  const { t, i18n } = useTranslation();
  const catalog = useFactorCatalogSearch();
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const formattedTotal = catalog.total.toLocaleString(i18n.language);

  const selectSource = (sourceKey: string) => {
    catalog.setFilter(
      "source",
      catalog.filters.source === sourceKey ? "" : sourceKey,
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("emissionFactorCatalog.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("emissionFactorCatalog.subtitle")}</p>
      </header>

      <FactorDataSourcesTable
        sourceFacets={catalog.facets?.sources ?? null}
        loading={catalog.facetsLoading && !catalog.facets}
        activeSource={catalog.filters.source}
        onSelectSource={selectSource}
      />

      <section className="space-y-4" aria-labelledby="ef-catalog-explorer-heading">
        <div className="space-y-1">
          <h2
            id="ef-catalog-explorer-heading"
            className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
          >
            {t("emissionFactorCatalog.explorerTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("emissionFactorCatalog.explorerSubtitle")}
          </p>
        </div>

        <FactorCatalogFilters
          filters={catalog.filters}
          facets={catalog.facets}
          moreOpen={moreOpen}
          onMoreOpenChange={setMoreOpen}
          onChange={catalog.setFilter}
          onReset={catalog.resetFilters}
          hasActiveFilters={catalog.hasActiveFilters}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {catalog.loading
              ? t("emissionFactorCatalog.loading")
              : t("emissionFactorCatalog.resultCount", {
                  count: catalog.total,
                  formatted: formattedTotal,
                })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!catalog.canPrev || catalog.loading}
              onClick={catalog.goPrev}
              aria-label={t("emissionFactorCatalog.prev")}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
              {t("emissionFactorCatalog.prev")}
            </Button>
            <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-foreground">
              {t("emissionFactorCatalog.page", { page: catalog.page })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!catalog.canNext || catalog.loading}
              onClick={catalog.goNext}
              aria-label={t("emissionFactorCatalog.next")}
            >
              {t("emissionFactorCatalog.next")}
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        {catalog.error && (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {t("emissionFactorCatalog.errorLoad")}
          </div>
        )}

        {!catalog.loading && !catalog.error && catalog.items.length === 0 && (
          <div className="rounded-md border border-dashed px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">{t("emissionFactorCatalog.empty")}</p>
            {catalog.hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={catalog.resetFilters}
              >
                {t("emissionFactorCatalog.resetFilters")}
              </Button>
            )}
          </div>
        )}

        {(catalog.items.length > 0 || catalog.loading) && (
          <>
            <FactorCatalogTable
              items={catalog.items}
              loading={catalog.loading}
              onSelect={openDetail}
            />
            <FactorCatalogMobileList
              items={catalog.items}
              loading={catalog.loading}
              onSelect={openDetail}
            />
          </>
        )}

        {!catalog.hasMore && catalog.items.length > 0 && !catalog.loading && (
          <p className="text-center text-xs text-muted-foreground">
            {t("emissionFactorCatalog.endOfResults")}
          </p>
        )}
      </section>

      <FactorDetailSheet
        factorId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
