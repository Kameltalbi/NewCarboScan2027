import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, Search, Filter, ArrowUpDown, LinkIcon, Loader2, Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useSupplierLabels } from "@/hooks/useSupplierLabels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useOrganizationId } from "@/hooks/useOrganizationId";

// Score colors matching Greenly style
const scoreConfig: Record<string, { bg: string; text: string }> = {
  'A+': { bg: 'bg-emerald-500', text: 'text-white' },
  'A':  { bg: 'bg-emerald-400', text: 'text-white' },
  'B':  { bg: 'bg-yellow-400', text: 'text-white' },
  'C':  { bg: 'bg-orange-400', text: 'text-white' },
  'D':  { bg: 'bg-red-400', text: 'text-white' },
  'E':  { bg: 'bg-red-600', text: 'text-white' },
};

const ScoreBadge: React.FC<{ score: string | null }> = ({ score }) => {
  if (!score) return <span className="text-xs text-muted-foreground">—</span>;
  const config = scoreConfig[score] || scoreConfig['E'];
  return (
    <span className={cn(
      "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold",
      config.bg, config.text
    )}>
      {score}
    </span>
  );
};

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-2 min-w-[140px]">
    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
      <div 
        className={cn(
          "h-full rounded-full transition-all",
          value >= 80 ? "bg-emerald-500" : value >= 50 ? "bg-amber-400" : "bg-red-400"
        )}
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="text-xs text-muted-foreground w-8 text-right">{value}%</span>
  </div>
);

export const FournisseursHome: React.FC = () => {
  const navigate = useNavigate();
  const { suppliers, stats, isLoading, isStatsLoading } = useSuppliers();
  const L = useSupplierLabels();
  const { organizationId } = useOrganizationId();
  const [activeTab, setActiveTab] = useState<'mes' | 'tous'>('mes');
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Aggregated purchases (amount + emissions) per supplier
  const { data: purchasesBySupplier = {} } = useQuery({
    queryKey: ['supplier-purchases-agg', organizationId],
    queryFn: async () => {
      if (!organizationId) return {};
      const { data, error } = await supabase
        .from('supplier_purchases')
        .select('supplier_id, amount, calculated_emissions_kgco2e')
        .eq('organization_id', organizationId);
      if (error) throw error;
      const agg: Record<string, { amount: number; emissions_kg: number }> = {};
      (data || []).forEach((r: any) => {
        if (!r.supplier_id) return;
        const cur = agg[r.supplier_id] || { amount: 0, emissions_kg: 0 };
        cur.amount += Number(r.amount || 0);
        cur.emissions_kg += Number(r.calculated_emissions_kgco2e || 0);
        agg[r.supplier_id] = cur;
      });
      return agg;
    },
    enabled: !!organizationId,
  });

  const fmtInt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
  const fmtLastBilan = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).getFullYear().toString();
  };

  // Derived filter options from real data
  const countries = useMemo(() => [...new Set(suppliers.map(s => s.country))].sort(), [suppliers]);
  const categories = useMemo(() => [...new Set(suppliers.map(s => s.purchase_category).filter(Boolean))].sort(), [suppliers]);

  // Filtered list
  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCountry !== 'all' && s.country !== filterCountry) return false;
      if (filterCategory !== 'all' && s.purchase_category !== filterCategory) return false;
      return true;
    });
  }, [suppliers, search, filterCountry, filterCategory]);

  // KPIs from real stats or computed
  const totalFournisseurs = stats?.total_suppliers ?? suppliers.length;
  const topCarbon = stats?.top_performers ?? suppliers.filter(s => ['A+', 'A'].includes(s.carbon_score || '')).length;
  const avgConfidence = stats?.avg_confidence ?? (suppliers.length > 0 ? Math.round(suppliers.reduce((s, f) => s + f.confidence_index, 0) / suppliers.length) : 0);
  const countriesCount = stats?.countries_count ?? countries.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{L.pageTitle}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-sm">
            <LinkIcon className="h-3.5 w-3.5" />
            {L.inviteCta}
          </Button>
          <Button size="sm" onClick={() => navigate('nouveau')} className="gap-2 text-sm">
            <Plus className="h-3.5 w-3.5" />
            {L.addCta}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {[
            { key: 'mes' as const, label: L.tabMine },
            { key: 'tous' as const, label: L.tabAll },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "pb-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* KPIs row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isStatsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-20" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{L.kpiTotal}</p>
                <p className="text-2xl font-bold">{totalFournisseurs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{L.kpiTop}</p>
                <p className="text-2xl font-bold">{topCarbon}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{L.kpiConfidence}</p>
                <p className="text-2xl font-bold">{avgConfidence}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{L.kpiCountries}</p>
                <p className="text-2xl font-bold">{countriesCount}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrer par pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {countries.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Filtrer par catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c!} value={c!}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Rechercher..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 w-[200px] text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 && suppliers.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{L.emptyTitle}</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                {L.emptyDesc}
              </p>
              <Button onClick={() => navigate('nouveau')} className="gap-2">
                <Plus className="h-4 w-4" />
                {L.emptyCta}
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    <button className="flex items-center gap-1 hover:text-foreground">
                      Nom <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">{L.colScore}</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{L.colCategory}</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">{L.colOutstanding}</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">{L.colEmissions}</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{L.colLastBilan}</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Pays</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const agg = purchasesBySupplier[f.id];
                  const emissionsT = agg ? agg.emissions_kg / 1000 : 0;
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`fiche/${f.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{f.name}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={f.carbon_score} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{f.purchase_category || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="text-sm">{agg ? fmtInt(agg.amount) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="text-sm font-medium">{agg ? fmtInt(emissionsT) : '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{fmtLastBilan(f.last_data_update)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{f.country}</span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length > 0 && (() => {
                  const totals = filtered.reduce((acc, f) => {
                    const agg = purchasesBySupplier[f.id];
                    if (agg) {
                      acc.amount += agg.amount;
                      acc.emissions_kg += agg.emissions_kg;
                    }
                    return acc;
                  }, { amount: 0, emissions_kg: 0 });
                  return (
                    <tr className="bg-muted/40 font-semibold">
                      <td className="px-4 py-3 text-sm" colSpan={3}>{L.totalRowLabel}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">{fmtInt(totals.amount)}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">{fmtInt(totals.emissions_kg / 1000)}</td>
                      <td className="px-4 py-3" colSpan={2} />
                    </tr>
                  );
                })()}
                {filtered.length === 0 && suppliers.length > 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Aucun{L.isBank ? 'e' : ''} {L.entitySingular} ne correspond aux filtres
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};
