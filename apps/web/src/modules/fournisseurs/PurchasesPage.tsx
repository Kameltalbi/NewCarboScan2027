/**
 * Achats — import-first, formulaire simple, qualité en langage clair.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, RefreshCw, Trash2, Upload, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { qualityHint, qualityLabel } from "./purchaseQualityLabels";
import { useOrganizationData } from "@/hooks/useOrganizationData";

const fmt = (n: number, d = 1) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);

export const PurchasesPage: React.FC = () => {
  const qc = useQueryClient();
  const { organization } = useOrganizationData();
  const defaultCurrency = organization?.currency || "TND";
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const limit = 50;

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => api.listSuppliers(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["purchases", year, search, offset],
    queryFn: () =>
      api.listSupplierPurchases({
        year: year || undefined,
        search: search || undefined,
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
      toast.success("Achat enregistré");
      if (res.warnings?.length) toast.message(res.warnings.join(" · "));
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ["purchases"] });
      void qc.invalidateQueries({ queryKey: ["supplier-stats"] });
      void qc.invalidateQueries({ queryKey: ["supplier-dashboard"] });
    },
    onError: () => toast.error("Échec de la création"),
  });

  const createSupplierMut = useMutation({
    mutationFn: (name: string) =>
      api.createSupplier({ name, country: "TN" } as Record<string, unknown>),
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
            Importez votre fichier comptable ou ajoutez quelques lignes manuellement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-1">
            <Link to="/app/fournisseurs/import">
              <Upload className="h-4 w-4" /> Importer mes achats
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setShowForm((v) => !v)}
          >
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
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nouvel achat</CardTitle>
          </CardHeader>
          <CardContent>
            <PurchaseForm
              suppliers={supplierOptions}
              defaultCurrency={defaultCurrency}
              busy={createMut.isPending || createSupplierMut.isPending}
              onCreateSupplier={async (name) => {
                const res = await createSupplierMut.mutateAsync(name);
                void qc.invalidateQueries({ queryKey: ["suppliers-list"] });
                return String(res?.item?.id || "");
              }}
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
                    <th className="px-3 py-2">Désignation</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                    <th className="px-3 py-2">Qualité</th>
                    <th className="px-3 py-2 text-right">tCO₂e</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={String(p.id)} className="border-b border-border/60">
                      <td className="px-3 py-2 tabular-nums">
                        {String(p.reference_year || "—")}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          className="font-medium text-teal-800 hover:underline"
                          to={`/app/fournisseurs/fiche/${p.supplier_id}`}
                        >
                          {String(p.supplier_name || "—")}
                        </Link>
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                        {String(p.description || p.product_service || p.purchase_category || "—")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.amount != null
                          ? `${fmt(Number(p.amount), 0)} ${String(p.currency || "")}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium"
                          title={qualityHint(String(p.data_quality_grade))}
                        >
                          {qualityLabel(String(p.data_quality_grade))}
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
                            onClick={() => {
                              setDetailId(String(p.id));
                              setShowAdvanced(false);
                            }}
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
                      <td colSpan={7} className="px-3 py-10 text-center">
                        <p className="mb-3 text-muted-foreground">Aucun achat pour le moment.</p>
                        <Button asChild className="gap-1">
                          <Link to="/app/fournisseurs/import">
                            <Upload className="h-4 w-4" /> Importer mes achats
                          </Link>
                        </Button>
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
            <CardTitle className="text-base">Détail de l&apos;achat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(() => {
              const p = items.find((x) => String(x.id) === detailId);
              if (!p) return <p className="text-muted-foreground">Sélectionnez une ligne.</p>;
              const grade = String(p.data_quality_grade);
              return (
                <>
                  <p>
                    <span className="text-muted-foreground">Qualité des données : </span>
                    <strong>{qualityLabel(grade)}</strong>
                  </p>
                  <p className="text-muted-foreground">{qualityHint(grade)}</p>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/app/fournisseurs/fiche/${p.supplier_id}`}>
                      Améliorer cette donnée
                    </Link>
                  </Button>

                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAdvanced((v) => !v)}
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition ${showAdvanced ? "rotate-180" : ""}`}
                    />
                    Options avancées
                  </button>
                  {showAdvanced && (
                    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                      <p>
                        Facteur : {String(p.emission_factor_value ?? "—")} · Source :{" "}
                        {String(p.emission_factor_source || "—")}
                      </p>
                      <p>
                        Méthode interne : {String(p.calculation_method || "—")} · Année FE :{" "}
                        {String(p.emission_factor_year || "—")}
                      </p>
                      {p.method_change_note && (
                        <p className="text-amber-800">{String(p.method_change_note)}</p>
                      )}
                      {(hist?.items || []).length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="font-medium">Historique</p>
                          {(hist?.items || []).map((h) => (
                            <p key={String(h.id)} className="text-muted-foreground">
                              {new Date(String(h.changed_at)).toLocaleString("fr-FR")} ·{" "}
                              {fmt(Number(h.previous_emissions_kgco2e || 0) / 1000, 2)} t →{" "}
                              {fmt(Number(h.new_emissions_kgco2e || 0) / 1000, 2)} t
                            </p>
                          ))}
                        </div>
                      )}
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
  defaultCurrency: string;
  busy?: boolean;
  onCreateSupplier: (name: string) => Promise<string>;
  onSubmit: (payload: Record<string, unknown>) => void;
}> = ({ suppliers, defaultCurrency, busy, onCreateSupplier, onSubmit }) => {
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [hasQty, setHasQty] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filtered = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 8);
    return suppliers.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [suppliers, supplierQuery]);

  const exactMatch = suppliers.find(
    (s) => s.name.toLowerCase() === supplierQuery.trim().toLowerCase(),
  );

  return (
    <form
      className="mx-auto max-w-lg space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        let sid = supplierId;
        if (!sid && supplierQuery.trim()) {
          if (exactMatch) {
            sid = exactMatch.id;
          } else {
            sid = await onCreateSupplier(supplierQuery.trim());
            if (!sid) {
              toast.error("Impossible de créer le fournisseur");
              return;
            }
          }
        }
        if (!sid) {
          toast.error("Indiquez un fournisseur");
          return;
        }
        if (!amount && !(hasQty && quantity)) {
          toast.error("Indiquez un montant ou une quantité");
          return;
        }
        onSubmit({
          supplier_id: sid,
          amount: amount ? Number(amount) : null,
          currency,
          quantity: hasQty && quantity ? Number(quantity) : null,
          quantity_unit: hasQty ? unit || null : null,
          purchase_category: "Autres",
          reference_year: Number(year),
          description: description || null,
          calculation_method: hasQty && quantity ? "physical" : "spend",
          ghg_scope3_category: 1,
          auto_calculate: true,
        });
      }}
    >
      <label className="block text-sm">
        Fournisseur
        <Input
          className="mt-1"
          placeholder="Rechercher ou saisir un nom…"
          value={supplierQuery}
          onChange={(e) => {
            setSupplierQuery(e.target.value);
            setSupplierId("");
          }}
        />
        {supplierQuery.trim() && (
          <ul className="mt-1 max-h-40 overflow-auto rounded-md border border-border bg-background text-sm">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    setSupplierId(s.id);
                    setSupplierQuery(s.name);
                  }}
                >
                  {s.name}
                </button>
              </li>
            ))}
            {!exactMatch && supplierQuery.trim().length > 1 && (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left font-medium text-teal-800 hover:bg-muted"
                  onClick={() => setSupplierId("")}
                >
                  + Créer « {supplierQuery.trim()} »
                </button>
              </li>
            )}
          </ul>
        )}
      </label>

      <label className="block text-sm">
        Qu&apos;avez-vous acheté ?
        <Input
          className="mt-1"
          placeholder="Ex. Ciment CEM II, ordinateurs, maintenance…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Montant
          <Input className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="block text-sm">
          Devise
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {[defaultCurrency, "TND", "EUR", "USD", "MAD", "DZD", "XOF", "XAF"]
              .filter((c, i, a) => a.indexOf(c) === i)
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Avez-vous la quantité ?</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={hasQty ? "default" : "outline"}
            onClick={() => setHasQty(true)}
          >
            Oui
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!hasQty ? "default" : "outline"}
            onClick={() => setHasQty(false)}
          >
            Non
          </Button>
        </div>
        {hasQty && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              Quantité
              <Input
                className="mt-1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Unité
              <Input
                className="mt-1"
                placeholder="t, kg, L…"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      <label className="block text-sm">
        Exercice
        <Input
          className="mt-1 max-w-[140px]"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>

      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        <ChevronDown className={`h-3.5 w-3.5 transition ${showAdvanced ? "rotate-180" : ""}`} />
        Options avancées
      </button>
      {showAdvanced && (
        <p className="text-xs text-muted-foreground">
          La catégorie, le facteur d&apos;émission et la méthode sont déterminés automatiquement
          par CarboScan. Vous pourrez les affiner plus tard depuis le détail de l&apos;achat.
        </p>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
      </Button>
    </form>
  );
};

export default PurchasesPage;
