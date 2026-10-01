/**
 * Barre de contexte compacte sous le titre du dashboard :
 * organisation · exercice · site · lien émissions financées (banques).
 * Réutilise le sélecteur de sites existant ; pas de redesign du dashboard.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Landmark } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardSiteFilter, type DashboardSite } from "./DashboardSiteFilter";
import { useSupplierLabels } from "@/hooks/useSupplierLabels";
import { cn } from "@/lib/utils";

export interface DashboardContextBarProps {
  organizationName: string;
  activeYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  sites: DashboardSite[];
  selectedSiteId: string | null;
  onSiteChange: (siteId: string | null) => void;
  sitesLoading?: boolean;
  className?: string;
}

export const DashboardContextBar: React.FC<DashboardContextBarProps> = ({
  organizationName,
  activeYear,
  availableYears,
  onYearChange,
  sites,
  selectedSiteId,
  onSiteChange,
  sitesLoading = false,
  className,
}) => {
  const navigate = useNavigate();
  const labels = useSupplierLabels();
  const years =
    availableYears.length > 0
      ? availableYears
      : [activeYear, activeYear - 1, activeYear - 2].filter((y, i, arr) => arr.indexOf(y) === i);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <p className="truncate text-sm font-semibold text-foreground">{organizationName}</p>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Exercice
          </span>
          <Select
            value={String(activeYear)}
            onValueChange={(v) => onYearChange(Number(v))}
          >
            <SelectTrigger className="h-9 w-[110px]" aria-label="Exercice de reporting">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Site
          </span>
          <DashboardSiteFilter
            sites={sites}
            selectedSiteId={selectedSiteId}
            onSiteChange={onSiteChange}
            isLoading={sitesLoading}
          />
          {selectedSiteId == null && sites.length > 1 && (
            <span className="hidden text-xs text-muted-foreground sm:inline">Vue consolidée</span>
          )}
        </div>
      </div>

      {labels.isBank && (
        <button
          type="button"
          onClick={() => navigate("/app/fournisseurs")}
          className="inline-flex items-center gap-2 self-start rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 sm:self-auto"
        >
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Émissions financées · PCAF</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
