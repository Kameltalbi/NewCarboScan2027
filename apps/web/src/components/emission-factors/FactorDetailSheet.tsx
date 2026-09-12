import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, type FactorCatalogDetail } from "@/integrations/api/client";
import {
  formatFactorUnit,
  formatFactorValue,
  formatGeography,
  internalCategoryLabel,
  needsReview,
  sourceDisplayLabel,
} from "./factorCatalogUtils";

type Props = {
  factorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FactorDetailSheet({ factorId, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<FactorCatalogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !factorId) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getEmissionFactor(factorId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setError(err instanceof Error ? err.message : "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, factorId]);

  const review = needsReview(detail?.units.normalizationStatus);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader className="space-y-1 border-b pb-4 text-left">
          <SheetTitle className="pr-8 text-base leading-snug">
            {loading ? t("emissionFactorCatalog.loading") : detail?.name ?? "—"}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2 text-sm">
            {detail && (
              <>
                <span>{sourceDisplayLabel(detail.source.key, detail.source.name)}</span>
                <Badge variant="secondary">{t("emissionFactorCatalog.inCatalog")}</Badge>
                {review && (
                  <Badge variant="outline" className="border-amber-500/60 text-amber-700">
                    {t("emissionFactorCatalog.reviewRequired")}
                  </Badge>
                )}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-4">
          {loading && (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {t("emissionFactorCatalog.errorDetail")}
            </p>
          )}

          {detail && !loading && (
            <>
              {review && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                  {t("emissionFactorCatalog.reviewRequiredHint")}
                </p>
              )}

              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                <Field label={t("emissionFactorCatalog.detail.value")}>
                  <span className="font-mono tabular-nums">{formatFactorValue(detail.value)}</span>
                </Field>
                <Field label={t("emissionFactorCatalog.detail.unit")}>
                  {formatFactorUnit(detail.unitNumerator, detail.unitDenominator)}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.source")}>
                  {sourceDisplayLabel(detail.source.key, detail.source.name)}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.dataset")}>
                  {detail.version.datasetVersion || detail.version.label || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.externalCode")}>
                  {detail.externalCode || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.factorType")}>
                  {detail.factorType || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.sourceCategory")}>
                  {detail.sourceCategory || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.sourceSubcategory")}>
                  {detail.sourceSubcategory || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.internalCategory")}>
                  {internalCategoryLabel(t, detail.internalCategory)}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.internalSubcategory")}>
                  {detail.internalSubcategory || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.country")}>
                  {detail.countryCode || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.region")}>
                  {detail.region || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.geography")}>
                  {formatGeography(detail.countryCode, detail.region) !== "—"
                    ? formatGeography(detail.countryCode, detail.region)
                    : detail.geography || "—"}
                </Field>
                <Field label={t("emissionFactorCatalog.detail.year")}>
                  {detail.factorYear ?? "—"}
                </Field>
              </dl>

              <section className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-semibold">{t("emissionFactorCatalog.detail.provenance")}</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                  <Field label={t("emissionFactorCatalog.detail.source")}>
                    {sourceDisplayLabel(detail.source.key, detail.source.name)}
                  </Field>
                  <Field label={t("emissionFactorCatalog.detail.dataset")}>
                    {detail.version.datasetVersion || "—"}
                  </Field>
                  <Field label={t("emissionFactorCatalog.detail.stableFactorId")}>
                    <span className="break-all font-mono text-xs">{detail.stableFactorId}</span>
                  </Field>
                  <Field label={t("emissionFactorCatalog.detail.externalCode")}>
                    {detail.externalCode || "—"}
                  </Field>
                </dl>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  );
}
