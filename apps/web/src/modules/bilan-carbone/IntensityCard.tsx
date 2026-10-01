import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import {
  carbonIntensities,
  resolveDenominators,
  type IntensityIndicator,
} from "@/lib/intensity/carbonIntensity";

function formatValue(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

export function IntensityCard({ totalKg }: { totalKg: number }) {
  const [indicators, setIndicators] = useState<IntensityIndicator[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getOrganization(), api.listSites()])
      .then(([orgResult, siteResult]) => {
        if (cancelled) return;
        const org = orgResult.organization;
        const sites = (siteResult.items || []).map((site) => ({
          employees: site.employees_count as number | string | null,
          surfaceM2: site.surface_m2 as number | string | null,
          revenue: site.annual_revenue as number | string | null,
        }));
        const denominators = resolveDenominators(
          {
            employees: org?.employees,
            surfaceM2: org?.totalSurface,
            revenue: org?.annualRevenue,
          },
          sites,
        );
        setIndicators(carbonIntensities({
          totalTonnes: totalKg / 1000,
          ...denominators,
          currency: org?.currency,
          productionLabel: org?.productionUnitLabel,
          productionQuantity: org?.productionUnitQuantity,
        }));
      })
      .catch(() => {
        if (!cancelled) setIndicators([]);
      });
    return () => {
      cancelled = true;
    };
  }, [totalKg]);

  if (indicators == null) return null;

  return (
    <div className="space-y-2 pt-3 max-w-xl text-xs" data-testid="carbon-intensities">
      <p className="font-medium text-slate-800">Intensités</p>
      <p className="text-muted-foreground">
        Indicateurs calculés sur le total affiché. Ils ne remplacent pas ce total.
      </p>
      {indicators.length === 0 && (
        <p className="text-muted-foreground">
          Aucun dénominateur renseigné. L&apos;effectif, la surface, le chiffre d&apos;affaires ou l&apos;unité produite se saisissent dans l&apos;organisation.
        </p>
      )}
      {indicators.map((item) => (
        <p key={item.id} className="text-muted-foreground">
          {item.label} : {formatValue(item.value)} {item.unit}
        </p>
      ))}
    </div>
  );
}
