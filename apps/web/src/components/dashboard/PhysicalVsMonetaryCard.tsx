/**
 * ABC-04 — split visuelle données physiques vs ratios monétaires (dashboard).
 */
import React, { useMemo } from "react";
import { Scale } from "lucide-react";
import { MethodNoteLink } from "@/components/method/MethodNoteLink";
import {
  PHYSICAL_PREFERENCE,
  UNVALIDATED_MONETARY_LABEL,
  shareByMethod,
} from "@/lib/activity-data/dataMethod";
import { cn } from "@/lib/utils";

type Line = { method?: string | null; kg: number; source?: string | null };

export function PhysicalVsMonetaryCard({ lines }: { lines: Line[] }) {
  const share = useMemo(() => shareByMethod(lines), [lines]);
  const unvalidated = lines.some((l) => l.source === UNVALIDATED_MONETARY_LABEL);

  const physicalPct =
    share.percent.physical +
    share.percent.direct_emission +
    share.percent.supplier_specific;
  const monetaryPct = share.percent.monetary;
  const otherPct = Math.max(
    0,
    Math.round((100 - physicalPct - monetaryPct) * 10) / 10,
  );

  const hasData = share.totalKg > 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <Scale className="h-4 w-4 text-emerald-600" />
        <h3 className="text-lg font-semibold text-foreground">
          Données physiques vs ratios monétaires
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {PHYSICAL_PREFERENCE}{" "}
        <MethodNoteLink noteId="ratios" label="Note de méthode" />
      </p>

      {!hasData ? (
        <p className="text-sm text-muted-foreground flex-1 flex items-center">
          Aucune ligne d&apos;émission avec méthode renseignée pour cet exercice.
        </p>
      ) : (
        <div className="space-y-4 flex-1">
          <div className="h-3 rounded-full overflow-hidden flex bg-muted">
            {physicalPct > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${physicalPct}%` }}
                title={`Physique ${physicalPct}%`}
              />
            )}
            {monetaryPct > 0 && (
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${monetaryPct}%` }}
                title={`Monétaire ${monetaryPct}%`}
              />
            )}
            {otherPct > 0 && (
              <div
                className="h-full bg-slate-400 transition-all"
                style={{ width: `${otherPct}%` }}
                title={`Autre / non renseigné ${otherPct}%`}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border px-2 py-3">
              <p className="text-2xl font-semibold tabular-nums text-emerald-700">
                {physicalPct.toFixed(physicalPct % 1 ? 1 : 0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Données physiques</p>
            </div>
            <div className="rounded-lg border border-border px-2 py-3">
              <p className="text-2xl font-semibold tabular-nums text-amber-700">
                {monetaryPct.toFixed(monetaryPct % 1 ? 1 : 0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ratios monétaires</p>
            </div>
            <div className="rounded-lg border border-border px-2 py-3">
              <p className="text-2xl font-semibold tabular-nums text-slate-600">
                {otherPct.toFixed(otherPct % 1 ? 1 : 0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Autre / non renseigné</p>
            </div>
          </div>

          <p
            className={cn(
              "text-xs leading-relaxed rounded-md border px-3 py-2",
              monetaryPct > 0 || unvalidated
                ? "border-amber-200 bg-amber-50/60 text-amber-950/80"
                : "border-border bg-muted/30 text-muted-foreground",
            )}
          >
            {monetaryPct > 0 || unvalidated
              ? "Les ratios monétaires (€ ou TND) ne sont pas validés ABC. Ils restent utilisables pour un ordre de grandeur, avec une qualité de donnée inférieure."
              : "Aucune contribution monétaire détectée sur cet exercice : la part affichée repose sur des données physiques ou fournisseurs."}
          </p>
        </div>
      )}
    </div>
  );
}
