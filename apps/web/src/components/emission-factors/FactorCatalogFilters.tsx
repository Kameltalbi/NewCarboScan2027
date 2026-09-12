import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, RotateCcw, Search } from "lucide-react";
import type { FactorCatalogFacetsResponse } from "@/integrations/api/client";
import { sourceDisplayLabel, internalCategoryLabel } from "./factorCatalogUtils";
import type { CatalogFilters } from "./useFactorCatalogSearch";

type Props = {
  filters: CatalogFilters;
  facets: FactorCatalogFacetsResponse | null;
  moreOpen: boolean;
  onMoreOpenChange: (open: boolean) => void;
  onChange: <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
};

const ALL = "__all__";

export function FactorCatalogFilters({
  filters,
  facets,
  moreOpen,
  onMoreOpenChange,
  onChange,
  onReset,
  hasActiveFilters,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={filters.q}
          onChange={(e) => onChange("q", e.target.value)}
          placeholder={t("emissionFactorCatalog.searchPlaceholder")}
          className="h-10 pl-9"
          aria-label={t("emissionFactorCatalog.searchPlaceholder")}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          id="ef-source"
          label={t("emissionFactorCatalog.filters.source")}
          value={filters.source}
          onChange={(v) => onChange("source", v)}
          options={(facets?.sources ?? []).map((s) => ({
            value: s.value,
            label: `${sourceDisplayLabel(s.value)} (${s.count})`,
          }))}
        />
        <FilterSelect
          id="ef-category"
          label={t("emissionFactorCatalog.filters.category")}
          value={filters.internal_category}
          onChange={(v) => onChange("internal_category", v)}
          allLabel={t("emissionFactorCatalog.filters.allFeminine")}
          options={(facets?.internalCategories ?? []).map((s) => ({
            value: s.value,
            label: `${internalCategoryLabel(t, s.value)} (${s.count})`,
          }))}
        />
        <FilterSelect
          id="ef-country"
          label={t("emissionFactorCatalog.filters.country")}
          value={filters.country_code}
          onChange={(v) => onChange("country_code", v)}
          options={(facets?.countryCodes ?? []).map((s) => ({
            value: s.value,
            label: `${s.value} (${s.count})`,
          }))}
        />
        <FilterSelect
          id="ef-type"
          label={t("emissionFactorCatalog.filters.type")}
          value={filters.factor_type}
          onChange={(v) => onChange("factor_type", v)}
          options={(facets?.factorTypes ?? []).map((s) => ({
            value: s.value,
            label: `${s.value} (${s.count})`,
          }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={() => onMoreOpenChange(!moreOpen)}
          aria-expanded={moreOpen}
        >
          {moreOpen ? (
            <ChevronUp className="mr-1 h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="mr-1 h-4 w-4" aria-hidden />
          )}
          {t("emissionFactorCatalog.filters.more")}
        </Button>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onReset}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {t("emissionFactorCatalog.resetFilters")}
          </Button>
        )}
      </div>

      {moreOpen && (
        <div className="grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ef-subcat">{t("emissionFactorCatalog.filters.subcategory")}</Label>
            <Input
              id="ef-subcat"
              value={filters.internal_subcategory}
              onChange={(e) => onChange("internal_subcategory", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ef-region">{t("emissionFactorCatalog.filters.region")}</Label>
            <Input
              id="ef-region"
              value={filters.region}
              onChange={(e) => onChange("region", e.target.value)}
              className="h-9"
            />
          </div>
          <FilterSelect
            id="ef-unit"
            label={t("emissionFactorCatalog.filters.unit")}
            value={filters.unit_denominator}
            onChange={(v) => onChange("unit_denominator", v)}
            options={(facets?.unitDenominators ?? []).map((s) => ({
              value: s.value,
              label: `${s.value} (${s.count})`,
            }))}
          />
          <FilterSelect
            id="ef-year"
            label={t("emissionFactorCatalog.filters.year")}
            value={filters.factor_year}
            onChange={(v) => onChange("factor_year", v)}
            options={(facets?.factorYears ?? []).map((s) => ({
              value: s.value,
              label: `${s.value} (${s.count})`,
            }))}
          />
          <div className="space-y-1.5">
            <Label htmlFor="ef-dataset">{t("emissionFactorCatalog.filters.dataset")}</Label>
            <Input
              id="ef-dataset"
              value={filters.dataset_version}
              onChange={(e) => onChange("dataset_version", e.target.value)}
              placeholder="23.9"
              className="h-9"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}) {
  const { t } = useTranslation();
  const all = allLabel ?? t("emissionFactorCatalog.filters.all");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger id={id} className="h-9">
          <SelectValue placeholder={all} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{all}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
