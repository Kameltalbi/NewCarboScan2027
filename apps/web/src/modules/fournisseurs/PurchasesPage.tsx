/**
 * Table centrale des lignes d'achat + création rapide + détail calcul.
 */
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number, d = 1) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);

const METHOD_LABEL: Record<string, string> = {
  spend: "Dépenses",
  physical: "Données physiques",
  supplier_specific: "Données fournisseur",
  hybrid: "Hybride",
};

export const PurchasesPage: React.FC = () => {
  const qc = useQueryClient();
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const limit = 50;

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => api.listSuppliers(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["purchases", year, search, method, offset],
    queryFn: () =>
      api.listSupplierPurchases({
        year: year || undefined,
        search: search || undefined,
        method: method || undefined,
        limit,
        offset,
      }),
  });

  const { data: hist } = useQuery({
    queryKey: ["purchase-history", detailId],
    queryFn: () => api.getSupplierPurchaseHistory(detailId!),
    enabled: !!detailId,
  });

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createSupplierPurchase(payload),
    onSuccess: (res) => {
      toast.success("Achat enregistré et calculé");
      if (res.warnings?.length) toast.message(res.warnings.join(" · "));
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      void qc.invalidateQueries({ queryKey: ["supplier-stats"] });
      void qc.invalidateQueries({ queryKey: ["supplier-dashboard"] });
    },
    onError: () => toast.error("Échec de la création"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.deleteSupplierPurchase(id),
    onSuccess: () => {
      toast.success("Achat supprimé");
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      void qc.invalidateQueries({ queryKey: ["supplier-stats"] });
    },
  });

  const recalcMut = useMutation({
    mutationFn: (id: string) => api.recalculateSupplierPurchase(id),
    onSuccess: (res) => {
      toast.success("Recalcul effectué");
      if (res.item?.method_change_note) {
        toast.message(String(res.item.method_change_note));
      }
      void qc.invalidateQueries({ queryKey: ["purchases"] });
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const supplierOptions = useMemo(
    () => (suppliers?.items || []).map((s) => ({ id: String(s.id), name: String(s.name) })),
    [suppliers],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Achats</h2>
          <p className="text-sm text-muted-foreground">
            Lignes d&apos;achat — source de vérité pour la consolidation au bilan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/fournisseurs/import">Importer</Link>
          </Button>
          <Button size="sm" className="gap-1" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Ajouter un achat
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-[140px]"
          placeholder="Exercice"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setOffset(0);
          }}
        />
        <Input
          className="max-w-xs"
          placeholder="Recherche…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
        <select
          className="rounded-md border border-border bg-background px-2 py-2 text-sm"
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">Toutes méthodes</option>
          <option value="spend">Dépenses</option>
          <option value="physical">Données physiques</option>
          <option value="supplier_specific">Données fournisseur</option>
        </select>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nouvel achat</CardTitle>
          </CardHeader>
          <CardContent>
            <PurchaseForm
              suppliers={supplierOptions}
              busy={createMut.isPending}
              onSubmit={(payload) => createMut.mutate(payload)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2">Exercice</th>
                    <th className="px-3 py-2">Fournisseur</th>
                    <th className="px-3 py-2">Catégorie</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                    <th className="px-3 py-2 text-right">Qté</th>
                    <th className="px-3 py-2">Méthode</th>
                    <th className="px-3 py-2">Qualité</th>
                    <th className="px-3 py-2 text-right">tCO₂e</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={String(p.id)} className="border-b border-border/60">
                      <td className="px-3 py-2 tabular-nums">{String(p.reference_year || "—")}</td>
                      <td className="px-3 py-2">
                        <Link
                          className="font-medium text-teal-800 hover:underline"
                          to={`/app/fournisseurs/fiche/${p.supplier_id}`}
                        >
                          {String(p.supplier_name || "—")}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {String(p.purchase_category || "—")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.amount != null
                          ? `${fmt(Number(p.amount), 0)} ${String(p.currency || "")}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.quantity != null
                          ? `${fmt(Number(p.quantity), 2)} ${String(p.quantity_unit || "")}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {METHOD_LABEL[String(p.calculation_method)] || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                          {String(p.data_quality_grade || "—")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {p.calculated_emissions_kgco2e != null
                          ? fmt(Number(p.calculated_emissions_kgco2e) / 1000, 2)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Voir le détail du calcul"
                            onClick={() => setDetailId(String(p.id))}
                          >
                            Détail
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => recalcMut.mutate(String(p.id))}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Supprimer cet achat ?")) {
                                delMut.mutate(String(p.id));
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                        Aucune ligne d&apos;achat. Importez un fichier ou ajoutez un achat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {total > limit && (
            <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {offset + 1}–{Math.min(offset + limit, total)} / {total}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Précédent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {detailId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Détail du calcul & historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(() => {
              const p = items.find((x) => String(x.id) === detailId);
              if (!p) return <p className="text-muted-foreground">Sélectionnez une ligne.</p>;
              return (
                <>
                  <p>
                    <span className="text-muted-foreground">Formule : </span>
                    {p.emission_factor_value != null &&
                    (p.quantity != null || p.amount != null) ? (
                      <span className="font-mono">
                        {p.quantity != null
                          ? `${fmt(Number(p.quantity), 2)} × ${p.emission_factor_value}`
                          : `${fmt(Number(p.amount), 0)} ${p.currency} × facteur`}
                        {" = "}
                        {fmt(Number(p.calculated_emissions_kgco2e || 0), 1)} kgCO₂e
                        {" = "}
                        {fmt(Number(p.calculated_emissions_kgco2e || 0) / 1000, 2)} tCO₂e
                      </span>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p>
                    Source facteur : {String(p.emission_factor_source || "—")} · Année :{" "}
                    {String(p.emission_factor_year || "—")} · Géographie :{" "}
                    {String(p.emission_factor_geography || "—")}
                  </p>
                  {p.method_change_note && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
                      {String(p.method_change_note)} — ce n&apos;est pas automatiquement une
                      réduction d&apos;émissions réelle.
                    </p>
                  )}
                  {(hist?.items || []).length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium">Historique</p>
                      {(hist?.items || []).map((h) => (
                        <div
                          key={String(h.id)}
                          className="rounded border border-border px-3 py-2 text-xs"
                        >
                          <p className="text-muted-foreground">
                            {new Date(String(h.changed_at)).toLocaleString("fr-FR")} ·{" "}
                            {String(h.change_reason || "")}
                          </p>
                          <p>
                            {String(h.previous_method || "—")} → {String(h.new_method || "—")} ·{" "}
                            {fmt(Number(h.previous_emissions_kgco2e || 0) / 1000, 2)} t →{" "}
                            {fmt(Number(h.new_emissions_kgco2e || 0) / 1000, 2)} t
                          </p>
                          {h.is_methodological_revaluation && (
                            <p className="text-amber-700">
                              Réévaluation méthodologique (amélioration des données)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDetailId(null)}>
                    Fermer
                  </Button>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PurchaseForm: React.FC<{
  suppliers: Array<{ id: string; name: string }>;
  busy?: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}> = ({ suppliers, busy, onSubmit }) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TND");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("Autres");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState("");
  const [calcMethod, setCalcMethod] = useState<"spend" | "physical">("spend");

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!supplierId) {
          toast.error("Choisissez un fournisseur");
          return;
        }
        onSubmit({
          supplier_id: supplierId,
          amount: amount ? Number(amount) : null,
          currency,
          quantity: quantity ? Number(quantity) : null,
          quantity_unit: unit || null,
          purchase_category: category,
          reference_year: Number(year),
          description: description || null,
          calculation_method: calcMethod,
          ghg_scope3_category: 1,
          auto_calculate: true,
        });
      }}
    >
      <label className="text-sm">
        Fournisseur
        <select
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Exercice
        <Input className="mt-1" value={year} onChange={(e) => setYear(e.target.value)} />
      </label>
      <label className="text-sm">
        Catégorie
        <Input className="mt-1" value={category} onChange={(e) => setCategory(e.target.value)} />
      </label>
      <label className="text-sm">
        Montant
        <Input className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label className="text-sm">
        Devise
        <select
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {["TND", "EUR", "USD", "MAD", "DZD", "XOF", "XAF", "EGP"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Méthode
        <select
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2"
          value={calcMethod}
          onChange={(e) => setCalcMethod(e.target.value as "spend" | "physical")}
        >
          <option value="spend">Dépenses</option>
          <option value="physical">Données physiques</option>
        </select>
      </label>
      {calcMethod === "physical" && (
        <>
          <label className="text-sm">
            Quantité
            <Input className="mt-1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="text-sm">
            Unité
            <Input className="mt-1" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, t, L…" />
          </label>
        </>
      )}
      <label className="text-sm sm:col-span-2">
        Description
        <Input className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="flex items-end">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer & calculer"}
        </Button>
      </div>
    </form>
  );
};

export default PurchasesPage;
