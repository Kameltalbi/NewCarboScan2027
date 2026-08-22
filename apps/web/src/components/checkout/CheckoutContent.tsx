import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api, sessionAuth } from "@/integrations/api/client";
import { Loader2, ShieldCheck, Tag, Building2, Package } from "lucide-react";
import { analytics } from "@/lib/analytics";

// Catalogue modules (aligné avec PricingConfigurator)
const MODULE_CATALOG: Array<{ id: string; name: string; description: string; price: number }> = [
  { id: "collecte", name: "Collecte de données avancée", description: "Traçabilité, historisation, audit", price: 500 },
  { id: "empreinte-produit", name: "Empreinte produit", description: "Calcul carbone produit – cradle-to-gate", price: 1400 },
  { id: "acv", name: "ACV – Analyse du Cycle de Vie", description: "Cradle-to-grave, multi-étapes", price: 3000 },
  { id: "net-zero", name: "Trajectoire Net Zero", description: "Scénarios de réduction pluriannuels", price: 2000 },
  { id: "wattbim", name: "WattBim – Suivi énergie IoT", description: "Monitoring temps réel Shelly EM, détection gaspillages", price: 1800 },
  { id: "cbam", name: "CBAM – Reporting export UE", description: "Déclarations trimestrielles, produits éligibles", price: 2500 },
  { id: "fournisseurs", name: "Fournisseurs / Portefeuille", description: "Scope 3 amont, questionnaires, scoring PCAF", price: 1500 },
  { id: "plan-actions", name: "Plan d'actions & Roadmap", description: "Leviers, KPI, suivi des réductions", price: 1200 },
];

type PricingConfig = {
  qualification: { collaborators: number; revenue: number; sites: number; entities?: number };
  eligible: boolean;
  pricing: {
    base: number;
    includedSites: number;
    siteUnitPrice: number;
    extraSites: number;
    sitesPrice: number;
    entities?: number;
    entitiesPrice?: number;
    modules: Array<{ id: string; name: string; price: number }>;
    modulesPrice: number;
    total: number;
  };
};

const STORAGE_KEY = "carboscan.pricingConfig";

export const CheckoutContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Config depuis navigation state ou sessionStorage (survit à l'aller-retour auth).
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(() => {
    const fromState = (location.state as any)?.pricingConfig as PricingConfig | undefined;
    if (fromState) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromState)); } catch {}
      return fromState;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PricingConfig) : null;
    } catch { return null; }
  });

  // Modules éditables au checkout
  const initialEnabled = useMemo(
    () => new Set((pricingConfig?.pricing.modules || []).map((m) => m.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [enabledModules, setEnabledModules] = useState<Set<string>>(initialEnabled);

  // Coordonnées de facturation (préremplies depuis auth + profile)
  const [billing, setBilling] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    vatId: "",
    address: "",
  });
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Code promo
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<
    | { code: string; discount_type: "percent" | "fixed"; discount_value: number; id: string }
    | null
  >(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const [isPaying, setIsPaying] = useState(false);

  // Charger session + profil pour préremplissage
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await sessionAuth.getUser();
      if (!mounted) return;
      if (!user) {
        setAuthReady(true);
        return;
      }
      setUserId(user.id);

      const me = await api.me().catch(() => null);
      const org = await api.getOrganization().catch(() => null);
      setBilling((b) => ({
        ...b,
        fullName: me?.user.fullName || b.fullName,
        email: user.email || me?.user.email || b.email,
        company: org?.organization?.name || b.company,
      }));
      setAuthReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  // Track begin_checkout once pricing config is available
  useEffect(() => {
    if (!pricingConfig?.pricing?.total) return;
    analytics.beginCheckout(pricingConfig.pricing.total, "TND");
  }, [pricingConfig?.pricing?.total]);

  const breakdown = useMemo(() => {
    if (!pricingConfig) return null;
    const base = pricingConfig.pricing.base;
    const sitesPrice = pricingConfig.pricing.sitesPrice;
    const entitiesPrice = pricingConfig.pricing.entitiesPrice || 0;

    const modules = MODULE_CATALOG.filter((m) => enabledModules.has(m.id));
    const modulesPrice = modules.reduce((s, m) => s + m.price, 0);
    const subtotal = base + sitesPrice + entitiesPrice + modulesPrice;

    let discount = 0;
    if (promoApplied) {
      discount =
        promoApplied.discount_type === "percent"
          ? Math.round((subtotal * promoApplied.discount_value) / 100)
          : Math.round(promoApplied.discount_value);
      discount = Math.min(discount, subtotal);
    }
    const totalHT = subtotal - discount;
    const tvaRate = 0.19;
    const tvaAmount = Math.round(totalHT * tvaRate);
    const totalTTC = totalHT + tvaAmount;

    return {
      base, sitesPrice, entitiesPrice,
      modules, modulesPrice,
      subtotal, discount, totalHT, tvaRate, tvaAmount, totalTTC,
    };
  }, [pricingConfig, enabledModules, promoApplied]);

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    try {
      const { promo: data } = await api.lookupPromoCode(code);

      if (!data) {
        toast({ title: "Code promo invalide", variant: "destructive" });
        setPromoApplied(null);
        return;
      }
      if (data.valid_until && new Date(data.valid_until as string) < new Date()) {
        toast({ title: "Code promo expiré", variant: "destructive" });
        return;
      }
      if (data.max_uses && (data.current_uses ?? 0) >= data.max_uses) {
        toast({ title: "Code promo épuisé", variant: "destructive" });
        return;
      }
      if (breakdown && data.minimum_amount && breakdown.subtotal < Number(data.minimum_amount)) {
        toast({ title: "Montant minimum non atteint", variant: "destructive" });
        return;
      }
      setPromoApplied({
        id: data.id as string,
        code: data.code as string,
        discount_type: data.discount_type as "percent" | "fixed",
        discount_value: Number(data.discount_value),
      });
      toast({ title: "Code appliqué", description: `Réduction ${data.code}` });
    } catch {
      toast({ title: "Code promo invalide", variant: "destructive" });
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePay = async () => {
    if (!pricingConfig || !breakdown) return;
    if (!userId) {
      // Rediriger vers auth en préservant la config via sessionStorage
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pricingConfig)); } catch {}
      toast({ title: "Connexion requise", description: "Créez un compte ou connectez-vous pour finaliser." });
      navigate(`/auth?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }
    if (!billing.company.trim() || !billing.fullName.trim() || !billing.email.trim()) {
      toast({ title: "Coordonnées incomplètes", description: "Nom, email et raison sociale sont requis.", variant: "destructive" });
      return;
    }

    setIsPaying(true);
    try {
      // Empêcher les doublons de commande
      const existing = await api.listOrders().catch(() => ({ items: [] as Array<Record<string, unknown>> }));
      const open = (existing.items || []).find((o) =>
        ["pending", "validated"].includes(String(o.status ?? "")),
      );
      if (open) {
        toast({ title: "Commande existante", description: "Une commande est déjà en cours. Contactez le support.", variant: "destructive" });
        return;
      }

      const finalConfig: PricingConfig = {
        ...pricingConfig,
        pricing: {
          ...pricingConfig.pricing,
          modules: breakdown.modules.map(({ id, name, price }) => ({ id, name, price })),
          modulesPrice: breakdown.modulesPrice,
          total: breakdown.totalHT,
        },
      };

      await api.createOrder({
        amount: breakdown.totalHT,
        currency: "TND",
        status: "validated",
        user_data: {
          billing,
          pricing_config: finalConfig,
          promo: promoApplied ? { code: promoApplied.code, discount: breakdown.discount } : null,
        },
      });

      analytics.purchase(breakdown.totalHT, "TND");

      await api.patchProfile({
        companyName: billing.company,
        phone: billing.phone,
        fullName: billing.fullName,
      }).catch(() => undefined);

      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}

      window.open("https://knct.me/4X3yuWlur", "_blank");
      toast({ title: "Paiement", description: "Le paiement s'ouvre dans un nouvel onglet." });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible de créer la commande.",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  if (!pricingConfig || !breakdown) {
    return (
      <section className="py-12">
        <div className="container mx-auto max-w-3xl px-4 md:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Aucune configuration n'a été trouvée. Configurez votre offre d'abord.
              </p>
              <Button onClick={() => navigate("/pricing")}>Configurer mon offre</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10">
      <div className="container mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Finaliser la commande
            </h1>
            <p className="text-muted-foreground mt-1">
              Étape 3/3 — Vos coordonnées sont pré-remplies. Un seul clic pour payer.
            </p>
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Paiement sécurisé
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* Colonne principale : billing + modules + promo */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" /> Coordonnées de facturation
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nom complet *</Label>
                  <Input id="fullName" value={billing.fullName}
                    onChange={(e) => setBilling({ ...billing, fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={billing.email}
                    onChange={(e) => setBilling({ ...billing, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Raison sociale *</Label>
                  <Input id="company" value={billing.company}
                    onChange={(e) => setBilling({ ...billing, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vatId">Matricule fiscal</Label>
                  <Input id="vatId" value={billing.vatId}
                    onChange={(e) => setBilling({ ...billing, vatId: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" type="tel" value={billing.phone}
                    onChange={(e) => setBilling({ ...billing, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input id="address" value={billing.address}
                    onChange={(e) => setBilling({ ...billing, address: e.target.value })} />
                </div>
                {!authReady && (
                  <p className="text-xs text-muted-foreground md:col-span-2 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Chargement de vos informations…
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" /> Modules complémentaires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MODULE_CATALOG.map((m) => {
                  const active = enabledModules.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors ${active ? "border-primary/50 bg-primary/5" : "border-border"}`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{m.name}</div>
                        <div className="text-sm text-muted-foreground">{m.description}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-foreground">
                          +{m.price.toLocaleString("fr-FR")} DT
                        </span>
                        <Switch
                          checked={active}
                          onCheckedChange={(v) => {
                            setEnabledModules((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(m.id); else next.delete(m.id);
                              return next;
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="h-5 w-5" /> Code promo
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Entrez votre code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  disabled={!!promoApplied}
                />
                {promoApplied ? (
                  <Button variant="outline" onClick={() => { setPromoApplied(null); setPromoInput(""); }}>
                    Retirer
                  </Button>
                ) : (
                  <Button onClick={applyPromo} disabled={promoLoading || !promoInput.trim()}>
                    {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne récap sticky */}
          <div>
            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Base annuelle</span>
                  <span className="font-semibold">{breakdown.base.toLocaleString("fr-FR")} DT</span>
                </div>
                {breakdown.sitesPrice > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sites supplémentaires</span>
                    <span className="font-medium">+{breakdown.sitesPrice.toLocaleString("fr-FR")} DT</span>
                  </div>
                )}
                {breakdown.entitiesPrice > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Entités supplémentaires</span>
                    <span className="font-medium">+{breakdown.entitiesPrice.toLocaleString("fr-FR")} DT</span>
                  </div>
                )}
                {breakdown.modules.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-sm font-medium text-foreground">Modules</div>
                    <ul className="space-y-1">
                      {breakdown.modules.map((m) => (
                        <li key={m.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate pr-2">{m.name}</span>
                          <span className="font-medium">+{m.price.toLocaleString("fr-FR")} DT</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="h-px bg-border my-2" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{breakdown.subtotal.toLocaleString("fr-FR")} DT</span>
                </div>
                {breakdown.discount > 0 && (
                  <div className="flex items-center justify-between text-sm text-emerald-600">
                    <span>Remise ({promoApplied?.code})</span>
                    <span>-{breakdown.discount.toLocaleString("fr-FR")} DT</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total HT</span>
                  <span className="font-semibold">{breakdown.totalHT.toLocaleString("fr-FR")} DT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">TVA (19%)</span>
                  <span className="font-semibold">+{breakdown.tvaAmount.toLocaleString("fr-FR")} DT</span>
                </div>

                <div className="h-px bg-border my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-foreground font-semibold">Total TTC</span>
                  <span className="text-2xl font-bold text-primary">
                    {breakdown.totalTTC.toLocaleString("fr-FR")} DT
                  </span>
                </div>

                <Button
                  onClick={handlePay}
                  disabled={isPaying}
                  className="w-full h-12 text-base mt-3"
                >
                  {isPaying ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement…</>
                  ) : (
                    "Payer par carte"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center pt-1">
                  Facturation annuelle HT. Paiement sécurisé.
                </p>

                {!pricingConfig.eligible && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Votre organisation dépasse les critères standards. Contactez-nous pour un devis dédié.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
