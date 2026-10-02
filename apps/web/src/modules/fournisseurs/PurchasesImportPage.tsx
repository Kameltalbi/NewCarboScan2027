/**
 * Import CSV — mapping auto, devise org, synthèse métier.
 */
import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useOrganizationData } from "@/hooks/useOrganizationData";

const FIELD_OPTIONS = [
  { key: "ignore", label: "— Ignorer —" },
  { key: "supplier_name", label: "Fournisseur" },
  { key: "supplier_code", label: "Code fournisseur" },
  { key: "amount", label: "Montant" },
  { key: "currency", label: "Devise" },
  { key: "quantity", label: "Quantité" },
  { key: "quantity_unit", label: "Unité" },
  { key: "purchase_category", label: "Catégorie comptable" },
  { key: "description", label: "Désignation / libellé" },
  { key: "product_service", label: "Produit / service" },
  { key: "site_name", label: "Site" },
  { key: "reference_year", label: "Exercice" },
  { key: "purchase_date", label: "Date" },
  { key: "invoice_ref", label: "Référence facture" },
  { key: "country", label: "Pays" },
] as const;

function parseDelimited(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delim = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        q = !q;
        continue;
      }
      if (c === delim && !q) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(lines[0]);
  const rows = lines.slice(1).map(split);
  return { headers, rows };
}

function guessMapping(header: string): string {
  const h = header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/code.?fourniss|supplier.?code|erp.?code/.test(h)) return "supplier_code";
  if (/fourniss|supplier|vendeur/.test(h)) return "supplier_name";
  if (/montant|amount|ht|ttc|spend/.test(h)) return "amount";
  if (/devise|currency|curr/.test(h)) return "currency";
  if (/quantit|qty|qte/.test(h)) return "quantity";
  if (/unit[e]?|uom/.test(h)) return "quantity_unit";
  if (/cat[e]?gor|compte.?comptable/.test(h)) return "purchase_category";
  if (/produit|service|article/.test(h)) return "product_service";
  if (/libell|desc|designation/.test(h)) return "description";
  if (/site|etablissement/.test(h)) return "site_name";
  if (/exercice|year|annee/.test(h)) return "reference_year";
  if (/date/.test(h)) return "purchase_date";
  if (/facture|invoice|ref.?achat/.test(h)) return "invoice_ref";
  if (/pays|country/.test(h)) return "country";
  return "ignore";
}

export const PurchasesImportPage: React.FC = () => {
  const qc = useQueryClient();
  const { organization } = useOrganizationData();
  const orgCurrency = organization?.currency || "TND";
  const [raw, setRaw] = useState("");
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [defaultCurrency, setDefaultCurrency] = useState(orgCurrency);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const parsed = useMemo(() => parseDelimited(raw), [raw]);

  const hasCurrencyCol = useMemo(
    () => Object.values(mapping).includes("currency"),
    [mapping],
  );

  const onFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      toast.message("Exportez votre Excel en CSV (séparateur ; ou ,) puis importez-le ici.");
      return;
    }
    const text = await file.text();
    setRaw(text);
    const { headers } = parseDelimited(text);
    const map: Record<number, string> = {};
    headers.forEach((h, i) => {
      map[i] = guessMapping(h);
    });
    setMapping(map);
    setDefaultCurrency(orgCurrency);
    setPreview(null);
    setResult(null);
  };

  const buildRows = () => {
    const rows: Record<string, unknown>[] = [];
    for (const cells of parsed.rows) {
      const obj: Record<string, unknown> = {};
      Object.entries(mapping).forEach(([idx, field]) => {
        if (!field || field === "ignore") return;
        const rawVal = cells[Number(idx)] ?? "";
        if (field === "amount" || field === "quantity" || field === "reference_year") {
          const n = Number(String(rawVal).replace(/\s/g, "").replace(",", "."));
          obj[field] = Number.isFinite(n) ? n : null;
        } else {
          obj[field] = rawVal || null;
        }
      });
      if (!obj.currency) obj.currency = defaultCurrency;
      if (obj.supplier_name) rows.push(obj);
    }
    return rows;
  };

  const dryMut = useMutation({
    mutationFn: async () => {
      const rows = buildRows();
      if (!rows.length) throw new Error("Aucune ligne valide (colonne Fournisseur requise)");
      return api.importSupplierPurchases({
        dryRun: true,
        rows,
        defaultCurrency,
      });
    },
    onSuccess: (res) => {
      setPreview(res);
      toast.success("Vérifiez le résumé puis continuez");
    },
    onError: (e: Error) => toast.error(e.message || "Échec prévisualisation"),
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      const rows = buildRows();
      return api.importSupplierPurchases({
        dryRun: false,
        rows,
        defaultCurrency,
      });
    },
    onSuccess: (res) => {
      setResult(res);
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      void qc.invalidateQueries({ queryKey: ["supplier-stats"] });
      void qc.invalidateQueries({ queryKey: ["supplier-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: () => toast.error("Échec de l’import"),
  });

  const p = (preview?.preview || result?.preview) as
    | {
        total?: number;
        newSuppliers?: number;
        matchedSuppliers?: number;
        withAmount?: number;
        suggestedCategories?: Record<string, number>;
      }
    | undefined;

  const recognizedCols = Object.values(mapping).filter((v) => v && v !== "ignore").length;

  const createdPurchases = Number(result?.createdPurchases || 0);
  const createdSuppliers = Number(result?.createdSuppliers || 0);
  const suggestedTotal = Object.values(p?.suggestedCategories || {}).reduce(
    (n, v) => n + Number(v),
    0,
  );
  const baseTotal = createdPurchases || Number(p?.total || 0);
  const categorizedPct =
    baseTotal > 0 && suggestedTotal > 0
      ? Math.min(100, Math.round((suggestedTotal / baseTotal) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Importer mes achats</h2>
        <p className="text-sm text-muted-foreground">
          Un fichier simple suffit : Fournisseur, Désignation, Montant. Les autres colonnes sont
          facultatives.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. Votre fichier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          {parsed.headers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {parsed.headers.length} colonnes · {parsed.rows.length} lignes · {recognizedCols}{" "}
              reconnues automatiquement
            </p>
          )}
        </CardContent>
      </Card>

      {parsed.headers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">2. Colonnes reconnues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsed.headers.map((h, i) => {
              const mapped = mapping[i] && mapping[i] !== "ignore";
              if (!mapped) return null;
              return (
                <div key={`${h}-${i}`} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="min-w-[140px] font-medium">{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1"
                    value={mapping[i]}
                    onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value }))}
                  >
                    {FIELD_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="truncate text-xs text-muted-foreground">
                    ex. {parsed.rows[0]?.[i] || "—"}
                  </span>
                </div>
              );
            })}

            {parsed.headers.some((_, i) => !mapping[i] || mapping[i] === "ignore") && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm font-medium">Colonnes non reconnues — à mapper si besoin</p>
                {parsed.headers.map((h, i) => {
                  if (mapping[i] && mapping[i] !== "ignore") return null;
                  return (
                    <div key={`${h}-u-${i}`} className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="min-w-[140px] text-muted-foreground">{h}</span>
                      <span>→</span>
                      <select
                        className="rounded-md border border-border bg-background px-2 py-1"
                        value={mapping[i] || "ignore"}
                        onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value }))}
                      >
                        {FIELD_OPTIONS.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium">Devise appliquée : {defaultCurrency}</span>
              {!hasCurrencyCol && (
                <span className="text-muted-foreground">
                  {" "}
                  (aucune colonne devise dans le fichier)
                </span>
              )}
              <select
                className="ml-3 rounded-md border border-border bg-background px-2 py-1 text-sm"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
              >
                {["TND", "EUR", "USD", "MAD", "DZD", "XOF", "XAF", "EGP"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <Button className="mt-2" disabled={dryMut.isPending} onClick={() => dryMut.mutate()}>
              {dryMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuer"}
            </Button>
          </CardContent>
        </Card>
      )}

      {p && !result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fournisseurs détectés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-lg font-semibold tabular-nums">
              {(p.newSuppliers || 0) + (p.matchedSuppliers || 0)} fournisseurs
            </p>
            <p>
              <strong>{p.newSuppliers}</strong> nouveaux · <strong>{p.matchedSuppliers}</strong>{" "}
              déjà présents
            </p>
            <p className="text-muted-foreground">
              {p.total} lignes d&apos;achat · {p.withAmount} avec montant · Devise :{" "}
              {defaultCurrency}
            </p>
            <p className="text-xs text-muted-foreground">
              Les nouveaux fournisseurs seront créés automatiquement (nom uniquement). Les
              catégories proposées restent à confirmer ensuite.
            </p>
            <Button disabled={commitMut.isPending} onClick={() => commitMut.mutate()}>
              {commitMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Créer et calculer"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {result && !result.dryRun && (
        <Card className="border-teal-200 bg-teal-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Votre analyse est prête</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <strong className="text-xl tabular-nums">{createdPurchases}</strong> achats
              </p>
              <p>
                <strong className="text-xl tabular-nums">
                  {createdSuppliers + Number(p?.matchedSuppliers || 0)}
                </strong>{" "}
                fournisseurs
              </p>
            </div>
            {categorizedPct > 0 && (
              <p>
                <strong>{categorizedPct}&nbsp;%</strong> catégorisés automatiquement ·{" "}
                <strong>{100 - categorizedPct}&nbsp;%</strong> pourront nécessiter une vérification
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link to="/app/fournisseurs/achats">Vérifier les achats</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/fournisseurs">Voir mon empreinte achats</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PurchasesImportPage;
