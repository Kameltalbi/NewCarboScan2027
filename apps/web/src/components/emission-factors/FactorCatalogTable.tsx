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
import type { FactorCatalogSearchItem } from "@/integrations/api/client";
import {
  factorSubtitle,
  formatFactorUnit,
  formatFactorValue,
  formatGeography,
  internalCategoryLabel,
  needsReview,
  sourceDisplayLabel,
} from "./factorCatalogUtils";

type Props = {
  items: FactorCatalogSearchItem[];
  loading: boolean;
  onSelect: (id: string) => void;
};

export function FactorCatalogTable({ items, loading, onSelect }: Props) {
  const { t } = useTranslation();

  if (loading && items.length === 0) {
    return (
      <div className="hidden space-y-2 md:block" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="hidden overflow-x-auto rounded-md border md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[220px]">{t("emissionFactorCatalog.columns.factor")}</TableHead>
            <TableHead className="w-[110px] text-right">{t("emissionFactorCatalog.columns.value")}</TableHead>
            <TableHead className="w-[120px]">{t("emissionFactorCatalog.columns.unit")}</TableHead>
            <TableHead className="w-[130px]">{t("emissionFactorCatalog.columns.source")}</TableHead>
            <TableHead className="w-[150px]">{t("emissionFactorCatalog.columns.category")}</TableHead>
            <TableHead className="w-[110px]">{t("emissionFactorCatalog.columns.geography")}</TableHead>
            <TableHead className="w-[70px] text-right">{t("emissionFactorCatalog.columns.year")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const sub = factorSubtitle(item);
            const review = needsReview(item.normalizationStatus);
            return (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={item.name}
                onClick={() => onSelect(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(item.id);
                  }
                }}
              >
                <TableCell className="align-top">
                  <div className="flex flex-wrap items-start gap-1.5">
                    <span className="font-medium leading-snug text-foreground">{item.name}</span>
                    {review && (
                      <Badge variant="outline" className="shrink-0 border-amber-500/60 text-amber-700 dark:text-amber-400">
                        {t("emissionFactorCatalog.reviewRequired")}
                      </Badge>
                    )}
                  </div>
                  {sub && (
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{sub}</div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {formatFactorValue(item.value)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFactorUnit(item.unitNumerator, item.unitDenominator)}
                </TableCell>
                <TableCell className="text-sm">
                  {sourceDisplayLabel(item.source.key, item.source.name)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.internalCategory
                    ? internalCategoryLabel(t, item.internalCategory)
                    : item.sourceCategory || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatGeography(item.countryCode, item.region)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {item.factorYear ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function FactorCatalogMobileList({ items, loading, onSelect }: Props) {
  const { t } = useTranslation();

  if (loading && items.length === 0) {
    return (
      <div className="space-y-2 md:hidden" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-2 md:hidden" aria-label={t("emissionFactorCatalog.title")}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className="w-full rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex flex-wrap items-start gap-1.5">
              <span className="font-medium leading-snug">{item.name}</span>
              {needsReview(item.normalizationStatus) && (
                <Badge variant="outline" className="border-amber-500/60 text-amber-700">
                  {t("emissionFactorCatalog.reviewRequired")}
                </Badge>
              )}
            </div>
            <div className="mt-1 font-mono text-sm tabular-nums">
              {formatFactorValue(item.value)}{" "}
              <span className="font-sans text-muted-foreground">
                {formatFactorUnit(item.unitNumerator, item.unitDenominator)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{sourceDisplayLabel(item.source.key, item.source.name)}</span>
              <span>
                {item.internalCategory
                  ? internalCategoryLabel(t, item.internalCategory)
                  : item.sourceCategory || "—"}
              </span>
              <span>{formatGeography(item.countryCode, item.region)}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
