import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ClimateReferenceTrajectory } from "../types";
import { CNZS_V131_META } from "../lib/sbti/cnzsV131AbsoluteContraction";

const fmt = (n: number, digits = 1) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trajectory: ClimateReferenceTrajectory | null;
}

/**
 * Détail méthodologique — hors écran principal.
 * Ne jamais afficher « SBTi Validated ».
 */
export const ReferenceMethodDrawer: React.FC<Props> = ({
  open,
  onOpenChange,
  trajectory,
}) => {
  if (!trajectory) return null;

  const s1 = Number(trajectory.scope1_emissions ?? 0);
  const s2 = Number(trajectory.scope2_emissions ?? 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Méthode de calcul</SheetTitle>
          <SheetDescription>
            Trajectoire de référence 1,5 °C — calcul CarboScan, pas une validation SBTi.
          </SheetDescription>
        </SheetHeader>

        <dl className="mt-6 space-y-4 text-sm">
          <Row label="Référentiel" value="SBTi" />
          <Row label="Version" value={trajectory.framework_version} />
          <Row label="Type d'objectif" value={trajectory.target_type || "Near-Term"} />
          <Row label="Ambition" value="1,5 °C" />
          <Row label="Méthode" value={trajectory.methodology} />
          <Row label="Année de référence" value={String(trajectory.base_year)} />
          <Row label="Année cible" value={String(trajectory.target_year)} />
          <Row label="Scope 1" value={`${fmt(s1)} tCO₂e`} />
          <Row label="Scope 2" value={`${fmt(s2)} tCO₂e`} />
          <Row
            label="Scope 1 + 2"
            value={`${fmt(Number(trajectory.baseline_emissions))} tCO₂e`}
          />
          <Row
            label="Taux annuel calculé (dLARR)"
            value={`${fmt(Number(trajectory.dlarr_percent), 2)} % / an`}
          />
          <Row
            label="Réduction cible"
            value={`−${fmt(Number(trajectory.reduction_percent), 1)} %`}
          />
          <Row
            label={`Émissions cibles ${trajectory.target_year}`}
            value={`${fmt(Number(trajectory.target_emissions))} tCO₂e`}
          />
        </dl>

        <p className="mt-6 text-sm text-muted-foreground">
          Le taux de réduction n&apos;est pas systématiquement fixé à 4,2&nbsp;%. La
          méthodologie SBTi v1.3.1 ajuste le rythme de réduction notamment en fonction de
          l&apos;année de référence et de la composition des émissions Scope&nbsp;1 et
          Scope&nbsp;2, avec un niveau minimum d&apos;ambition.
        </p>

        <details className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Détails techniques
          </summary>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Formule (Eq. 8) :</span>{" "}
              E(y) = E_BY − [E_BY × dLARR × (y − BY)]
            </p>
            <p>
              <span className="font-medium text-foreground">Source :</span>{" "}
              {trajectory.source_document || CNZS_V131_META.sourceDocument}
            </p>
            {trajectory.source_url && (
              <p>
                <span className="font-medium text-foreground">URL :</span>{" "}
                <a
                  href={trajectory.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {trajectory.source_url}
                </a>
              </p>
            )}
            <p>
              <span className="font-medium text-foreground">method_key :</span>{" "}
              {trajectory.method_key}
            </p>
            <p>
              <span className="font-medium text-foreground">Pondération S1/S2 :</span>{" "}
              {trajectory.weighting_status === "inferred_from_table1_and_table2"
                ? "méthode reconstruite (reproduit Table 1) — non citée explicitement dans le texte récupéré"
                : trajectory.weighting_status || "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">Date de calcul :</span>{" "}
              {new Date(trajectory.calculated_at).toLocaleString("fr-FR")}
            </p>
            <p>
              <span className="font-medium text-foreground">Périmètre :</span> Scope 1 + Scope
              2 (Scope 3 exclu de ce moteur)
            </p>
            {trajectory.assumptions && (
              <pre className="mt-2 whitespace-pre-wrap rounded bg-background p-2 text-[11px]">
                {trajectory.assumptions}
              </pre>
            )}
          </div>
        </details>
      </SheetContent>
    </Sheet>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/60 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
