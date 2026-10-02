/**
 * Import CSV/Excel (texte) — mapping colonnes + dry-run + commit.
 */
import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const FIELD_OPTIONS = [
  { key: "ignore", label: "— Ignorer —" },
  { key: "supplier_name", label: "Fournisseur" },
  { key: "amount", label: "Montant" },
  { key: "currency", label: "Devise" },
  { key: "quantity", label: "Quantité" },
  { key: "quantity_unit", label: "Unité" },
  { key: "purchase_category", label: "Catégorie" },
  { key: "product_service", label: "Produit / service" },
  { key: "description", label: "Description / libellé" },
  { key: "site_name", label: "Site" },
  { key: "reference_year", label: "Exercice" },
  { key: "purchase_date", label: "Date" },
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
  const h = header.toLowerCase();
  if (/fourniss|supplier|vendeur/.test(h)) return "supplier_name";
  if (/montant|amount|ht|ttc|spend/.test(h)) return "amount";
  if (/devise|currency|curr/.test(h)) return "currency";
  if (/quantit|qty/.test(h)) return "quantity";
  if (/unit[eé]|uom/.test(h)) return "quantity_unit";
  if (/cat[eé]gor/.test(h)) return "purchase_category";
  if (/produit|service|article/.test(h)) return "product_service";
  if (/libell|desc|designation|désignation/.test(h)) return "description";
  if (/site|établissement|etablissement/.test(h)) return "site_name";
  if (/exercice|year|ann[eé]e/.test(h)) return "reference_year";
  if (/date/.test(h)) return "purchase_date";
  if (/pays|country/.test(h)) return "country";
  return "ignore";
}

export const PurchasesImportPage: React.FC = () => {
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const parsed = useMemo(() => parseDelimited(raw), [raw]);

  const onFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      toast.message(
        "Pour l’instant, exportez votre Excel en CSV (séparateur ; ou ,) puis importez-le ici.",
      );
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
      if (obj.supplier_name) rows.push(obj);
    }
    return rows;
  };

  const dryMut = useMutation({
    mutationFn: async () => {
      const rows = buildRows();
      if (!rows.length) throw new Error("Aucune ligne valide (fournisseur requis)");
      return api.importSupplierPurchases({ dryRun: true, rows });
    },
    onSuccess: (res) => {
      setPreview(res);
      toast.success("Prévisualisation prête — validez l’import");
    },
    onError: (e: Error) => toast.error(e.message || "Échec prévisualisation"),
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      const rows = buildRows();
      return api.importSupplierPurchases({ dryRun: false, rows });
    },
    onSuccess: (res) => {
      setResult(res);
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      void qc.invalidateQueries({ queryKey: ["supplier-stats"] });
      void qc.invalidateQueries({ queryKey: ["supplier-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Import terminé");
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

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Importer mes achats</h2>
        <p className="text-sm text-muted-foreground">
          CSV (.csv) — Excel : enregistrez d&apos;abord en CSV. Les classifications carbone restent à
          valider (suggestions CarboScan uniquement).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. Fichier</CardTitle>
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
              {parsed.headers.length} colonnes · {parsed.rows.length} lignes détectées
            </p>
          )}
        </CardContent>
      </Card>

      {parsed.headers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">2. Mapping des colonnes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {parsed.headers.map((h, i) => (
              <div key={`${h}-${i}`} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="min-w-[160px] font-medium text-foreground">{h}</span>
                <span className="text-muted-foreground">→</span>
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
                <span className="truncate text-xs text-muted-foreground">
                  ex. {parsed.rows[0]?.[i] || "—"}
                </span>
              </div>
            ))}
            <Button
              className="mt-3"
              disabled={dryMut.isPending}
              onClick={() => dryMut.mutate()}
            >
              {dryMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "3. Prévisualiser"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {p && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prévisualisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {p.total} lignes · {p.matchedSuppliers} fournisseurs existants ·{" "}
              {p.newSuppliers} nouveaux · {p.withAmount} avec montant
            </p>
            <p className="text-muted-foreground">
              Suggestions de catégories CarboScan (à confirmer à l&apos;import) :{" "}
              {Object.entries(p.suggestedCategories || {})
                .map(([k, v]) => `${k} (${v})`)
                .join(", ")}
            </p>
            {!result && (
              <Button
                disabled={commitMut.isPending}
                onClick={() => {
                  if (
                    confirm(
                      "Importer et calculer les émissions ? Les suggestions de catégories seront appliquées.",
                    )
                  ) {
                    commitMut.mutate();
                  }
                }}
              >
                {commitMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "4. Valider l’import"
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {result && !result.dryRun && (
        <Card className="border-teal-200 bg-teal-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Votre première analyse achats est prête</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {String(result.createdSuppliers)} fournisseurs créés ·{" "}
              {String(result.createdPurchases)} lignes d&apos;achat importées
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link to="/app/fournisseurs">Voir la vue d&apos;ensemble</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/fournisseurs/qualite">Voir les fournisseurs prioritaires</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PurchasesImportPage;
