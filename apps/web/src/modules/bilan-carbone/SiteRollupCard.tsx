import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { MethodNoteLink } from "@/components/method/MethodNoteLink";
import { rollupSites, type EmissionSiteLine } from "@/lib/perimeter/siteRollup";

function tonnes(kg: number): string {
  return String(Math.round(kg / 1000));
}

export function SiteRollupCard({
  lines,
  organizationKg,
}: {
  lines: Array<EmissionSiteLine & { siteId?: string | null }>;
  organizationKg: number;
}) {
  const [names, setNames] = useState<Record<string, string>>({});
  const knownLines = lines.filter((line) => line.siteId !== undefined) as EmissionSiteLine[];
  const rollup = rollupSites(knownLines);

  useEffect(() => {
    let cancelled = false;
    api.listSites()
      .then((result) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const site of result.items || []) {
          next[String(site.id)] = String(site.name ?? "Site");
        }
        setNames(next);
      })
      .catch(() => {
        if (!cancelled) setNames({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (organizationKg <= 0 && lines.length === 0) return null;

  return (
    <div className="space-y-2 pt-3 max-w-xl text-xs" data-testid="site-rollup">
      <p className="font-medium text-slate-800">Répartition par site</p>
      <p className="text-muted-foreground">
        Total organisation : {tonnes(organizationKg)} tCO₂e. Chaque ligne y entre une fois.
      </p>
      {knownLines.length === 0 && (
        <p className="text-muted-foreground">
          Ce total ne détaille pas les sites.
        </p>
      )}
      {rollup.sites.map((site) => (
        <p key={site.siteId} className="text-muted-foreground">
          {names[site.siteId] || "Site"} : {tonnes(site.kg)} tCO₂e
        </p>
      ))}
      {rollup.unassignedKg > 0 && (
        <p className="text-muted-foreground">
          Non affecté à un site : {tonnes(rollup.unassignedKg)} tCO₂e
        </p>
      )}
      {knownLines.length > 0 && rollup.balanced && Math.abs(rollup.organizationKg - organizationKg) < 0.5 && (
        <p className="text-muted-foreground">
          Sites et lignes non affectées retrouvent le total des lignes.
        </p>
      )}
      {rollup.overlaps.map((overlap) => (
        <p key={`${overlap.siteId}-${overlap.scope}`} className="text-amber-800">
          {names[overlap.siteId] || "Site"}, scope {overlap.scope} : une donnée de site et une clé de répartition coexistent. La clé n&apos;est pas ajoutée.
        </p>
      ))}
      <p className="text-muted-foreground">
        Une clé de répartition reste une vue du total. Il n&apos;y a pas de transfert interne : deux lignes saisies restent deux émissions.{" "}
        <MethodNoteLink noteId="doubles-comptes" label="Note de méthode" />
      </p>
    </div>
  );
}
