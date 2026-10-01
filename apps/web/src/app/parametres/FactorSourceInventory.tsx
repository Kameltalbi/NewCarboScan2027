import { useEffect, useState } from "react";
import { MethodNoteLink } from "@/components/method/MethodNoteLink";
import { api } from "@/integrations/api/client";
import {
  listCorporateFactorSources,
  sourceUsage,
  sourceUsageLabel,
  type FactorSourceVersion,
} from "@/lib/factors/factorSourceInventory";

export function FactorSourceInventory() {
  const [rows, setRows] = useState<FactorSourceVersion[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.listFactorSources()
      .then((data) => {
        if (!cancelled) setRows(listCorporateFactorSources(data.items));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-3" data-testid="factor-source-inventory">
      <div>
        <h2 className="text-lg font-semibold">Bases de facteurs du registre</h2>
        <p className="text-sm text-muted-foreground">
          Versions enregistrées et nombre de facteurs du sous-ensemble de calcul.{" "}
          <MethodNoteLink noteId="sources" label="Note de méthode : sources" />
        </p>
      </div>
      {error && (
        <p className="text-sm text-muted-foreground">Le registre des sources n&apos;a pas pu être lu.</p>
      )}
      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune source enregistrée dans le registre.</p>
      )}
      {rows && rows.length > 0 && (
        <ul className="grid gap-3">
          {rows.map((row) => {
            const usage = sourceUsage(row);
            return (
              <li
                key={`${row.sourceKey}-${row.datasetVersion ?? row.versionLabel ?? "none"}`}
                data-testid={`factor-source-${row.sourceKey}`}
                className="rounded-lg border p-4 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{sourceUsageLabel(usage)}</p>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {row.versionLabel ?? "Version non renseignée"}
                  {row.datasetVersion ? ` · ${row.datasetVersion}` : ""}
                  {row.publishedYear ? ` · ${row.publishedYear}` : ""}
                  {row.gwpSet ? ` · PRG ${row.gwpSet}` : ""}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {row.calculableCount} dans le sous-ensemble de calcul · {row.factorCount} au registre
                  {row.publisher ? ` · ${row.publisher}` : ""}
                  {row.license ? ` · ${row.license}` : ""}
                </p>
                {row.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">Note de version : {row.notes}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
