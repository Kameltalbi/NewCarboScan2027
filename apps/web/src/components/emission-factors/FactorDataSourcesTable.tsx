import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FactorCatalogFacetBucket } from "@/integrations/api/client";
import { FACTOR_DATA_SOURCES } from "./factorDataSources";
import { sourceDisplayLabel } from "./factorCatalogUtils";

type Props = {
  sourceFacets: FactorCatalogFacetBucket[] | null;
  loading?: boolean;
  activeSource: string;
  onSelectSource: (sourceKey: string) => void;
};

export function FactorDataSourcesTable({
  sourceFacets,
  loading,
  activeSource,
  onSelectSource,
}: Props) {
  const { t, i18n } = useTranslation();
  const countByKey = new Map(
    (sourceFacets ?? []).map((s) => [s.value, s.count] as const),
  );

  const rows = FACTOR_DATA_SOURCES.map((meta) => ({
    meta,
    count: countByKey.has(meta.sourceKey)
      ? (countByKey.get(meta.sourceKey) as number)
      : null,
  }));

  return (
    <section className="space-y-3" aria-labelledby="ef-data-sources-heading">
      <div className="overflow-hidden rounded-lg border bg-slate-900 text-slate-50">
        <div className="px-4 py-5 sm:px-6">
          <h2
            id="ef-data-sources-heading"
            className="text-lg font-semibold tracking-tight sm:text-xl"
          >
            {t("emissionFactorCatalog.dataSources.title")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            {t("emissionFactorCatalog.dataSources.subtitle")}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[10rem]">
                {t("emissionFactorCatalog.dataSources.columns.source")}
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                {t("emissionFactorCatalog.dataSources.columns.factors")}
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                {t("emissionFactorCatalog.dataSources.columns.datasets")}
              </TableHead>
              <TableHead>
                {t("emissionFactorCatalog.dataSources.columns.license")}
              </TableHead>
              <TableHead>
                {t("emissionFactorCatalog.dataSources.columns.dataType")}
              </TableHead>
              <TableHead>
                {t("emissionFactorCatalog.dataSources.columns.geography")}
              </TableHead>
              <TableHead className="min-w-[18rem]">
                {t("emissionFactorCatalog.dataSources.columns.description")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map(({ meta, count }) => {
                  const selected = activeSource === meta.sourceKey;
                  const label = sourceDisplayLabel(meta.sourceKey);
                  return (
                    <TableRow
                      key={meta.sourceKey}
                      data-state={selected ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => onSelectSource(meta.sourceKey)}
                    >
                      <TableCell>
                        <button
                          type="button"
                          className="text-left font-medium text-primary underline-offset-4 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSource(meta.sourceKey);
                          }}
                        >
                          {label}
                        </button>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {count == null
                          ? "—"
                          : count.toLocaleString(i18n.language)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {meta.datasets}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {t(
                            `emissionFactorCatalog.dataSources.license.${meta.license}`,
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t(
                          `emissionFactorCatalog.dataSources.dataType.${meta.dataType}`,
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t(
                          `emissionFactorCatalog.dataSources.geography.${meta.geographyKey}`,
                        )}
                      </TableCell>
                      <TableCell className="max-w-md text-sm text-muted-foreground">
                        {t(
                          `emissionFactorCatalog.dataSources.descriptions.${meta.sourceKey}`,
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {activeSource ? (
        <p className="text-xs text-muted-foreground">
          {t("emissionFactorCatalog.dataSources.filteredHint", {
            source: sourceDisplayLabel(activeSource),
          })}
        </p>
      ) : null}
    </section>
  );
}
