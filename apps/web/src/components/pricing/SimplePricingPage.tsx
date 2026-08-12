import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { api } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  Package,
  Leaf,
  Sparkles,
  FileSpreadsheet,
  Shield,
  Check,
  Send,
  Mail,
  Phone,
  Building2,
  User,
  CheckCircle2,
  CalendarPlus,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface AddonModule {
  id: string;
  name: string;
  benefit: string;
  icon: React.ElementType;
  enabled: boolean;
}

// ── Editable inline value ──────────────────────────────────────
const EditableValue: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
  formatDisplay?: (v: number) => string;
}> = ({ value, onChange, min, max, suffix, formatDisplay }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    setEditing(false);
    const num = parseInt(draft, 10);
    if (!isNaN(num)) onChange(Math.max(min, Math.min(max, num)));
  };

  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        min={min}
        max={max}
        className="w-20 text-base font-bold text-primary text-right bg-transparent border-b-2 border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  }

  const display = formatDisplay ? formatDisplay(value) : value.toLocaleString();
  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="text-base font-bold text-primary hover:underline cursor-text"
      title="Cliquez pour saisir manuellement"
    >
      {display}{suffix ? ` ${suffix}` : ''}
    </button>
  );
};

// ── Main Component ─────────────────────────────────────────────
export const SimplePricingPage: React.FC = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entities, setEntities] = useState(1);
  const [collaborators, setCollaborators] = useState(50);
  const [revenue, setRevenue] = useState(10);
  const [years, setYears] = useState(1);
  const [sitesPerEntity, setSitesPerEntity] = useState<number[]>([1]);
  const [formSent, setFormSent] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', company: '', phone: '' });

  const handleEntitiesChange = (count: number) => {
    setEntities(count);
    setSitesPerEntity((prev) => {
      if (count > prev.length) return [...prev, ...Array(count - prev.length).fill(1)];
      return prev.slice(0, count);
    });
  };

  const handleSiteChange = (entityIndex: number, value: number) => {
    setSitesPerEntity((prev) => {
      const next = [...prev];
      next[entityIndex] = value;
      return next;
    });
  };

  const [addons, setAddons] = useState<AddonModule[]>([
    { id: 'empreinte-produit', name: 'Empreinte Produit', benefit: 'Mesurez l\'impact carbone de chaque produit', icon: Package, enabled: false },
    { id: 'acv', name: 'ACV – Cycle de Vie', benefit: 'Évaluez l\'impact environnemental complet', icon: Leaf, enabled: false },
    { id: 'cbam', name: 'CBAM Calculator', benefit: 'Anticipez les coûts carbone à l\'export UE', icon: FileSpreadsheet, enabled: false },
    { id: 'net-zero', name: 'Trajectoire Net Zéro', benefit: 'Pilotez votre décarbonation pluriannuelle', icon: Sparkles, enabled: false },
    { id: 'fournisseurs', name: 'Gestion Fournisseurs', benefit: 'Gérez l\'empreinte de vos fournisseurs', icon: Shield, enabled: false },
  ]);

  const toggleAddon = (id: string) => {
    setAddons((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  const totalSites = sitesPerEntity.reduce((s, v) => s + v, 0);
  const enabledAddons = addons.filter((m) => m.enabled);
  const hasCustomized = entities > 1 || totalSites > 1 || years > 1 || collaborators !== 50 || revenue !== 10 || enabledAddons.length > 0;

  // Summary items for sidebar
  const summaryItems = [
    { label: 'Socle CarboScan', detail: 'Collecte + Bilan Carbone — toujours inclus' },
    { label: `${entities} entité${entities > 1 ? 's' : ''}`, detail: `${totalSites} site${totalSites > 1 ? 's' : ''} au total` },
    { label: `${collaborators.toLocaleString()} collaborateurs`, detail: `CA ${revenue < 1 ? '< 1' : revenue} M DT` },
    { label: `${years} année${years > 1 ? 's' : ''}`, detail: years === 1 ? '1 année incluse' : `1 incluse + ${years - 1} supplémentaire${years - 1 > 1 ? 's' : ''}` },
    ...enabledAddons.map((a) => ({ label: a.name, detail: a.benefit })),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Hero */}
      <section className="py-12 md:py-20 text-center">
        <div className="container mx-auto max-w-3xl px-4">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
            Créez <span className="text-primary">votre plan</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Configurez votre solution carbone et recevez une offre personnalisée adaptée à vos besoins.
          </p>
        </div>
      </section>

      {/* Two-column layout */}
      <section className="pb-16 md:pb-24">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

            {/* LEFT — Configurator */}
            <div className="space-y-6">

              {/* Socle */}
              <Card className="border border-border shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 pt-6 pb-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Socle CarboScan</h2>
                    <p className="text-xs text-muted-foreground">Collecte de données + Bilan Carbone — toujours inclus</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-2 mb-6 p-4 rounded-lg bg-muted/40">
                    {[
                      'Tableau de bord de pilotage',
                      'Bilan carbone Scopes 1, 2 & 3',
                      'Conformité ISO 14064 / GHG Protocol',
                      'Collecte de données intégrée',
                      '1 site inclus par entité',
                      'Export rapport PDF',
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Ajustez votre périmètre</p>

                  {/* Entités */}
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm font-semibold text-foreground">Entités</Label>
                        <EditableValue value={entities} onChange={handleEntitiesChange} min={1} max={10} />
                      </div>
                      <Slider value={[entities]} onValueChange={([v]) => handleEntitiesChange(v)} min={1} max={10} step={1} />
                    </div>

                    {/* Sites per entity */}
                    <div>
                      <Label className="text-sm font-semibold text-foreground mb-2 block">
                        Sites par entité
                        <span className="font-normal text-muted-foreground ml-1 text-xs">(1 inclus)</span>
                      </Label>
                      {entities === 1 ? (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">Entité 1</span>
                            <EditableValue value={sitesPerEntity[0]} onChange={(v) => handleSiteChange(0, v)} min={1} max={20} />
                          </div>
                          <Slider value={[sitesPerEntity[0]]} onValueChange={([v]) => handleSiteChange(0, v)} min={1} max={20} step={1} />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sitesPerEntity.map((sc, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-14 flex-shrink-0">Entité {i + 1}</span>
                              <Slider value={[sc]} onValueChange={([v]) => handleSiteChange(i, v)} min={1} max={20} step={1} className="flex-1" />
                              <span className="text-xs font-semibold text-foreground w-6 text-right">{sc}</span>
                            </div>
                          ))}
                          <p className="text-xs text-muted-foreground">{totalSites} site{totalSites > 1 ? 's' : ''} au total</p>
                        </div>
                      )}
                    </div>

                    {/* Collaborators & Revenue */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-sm font-semibold text-foreground">Collaborateurs</Label>
                          <EditableValue value={collaborators} onChange={setCollaborators} min={1} max={1000} />
                        </div>
                        <Slider value={[collaborators]} onValueChange={([v]) => setCollaborators(v)} min={1} max={1000} step={1} />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-sm font-semibold text-foreground">CA annuel</Label>
                          <EditableValue value={revenue} onChange={setRevenue} min={0} max={200} suffix="M DT" formatDisplay={(v) => (v < 1 ? '< 1' : String(v))} />
                        </div>
                        <Slider value={[revenue]} onValueChange={([v]) => setRevenue(v)} min={0} max={200} step={1} />
                      </div>
                    </div>

                    {/* Années d'abonnement */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <CalendarPlus className="h-4 w-4 text-primary" />
                          Années d'abonnement
                        </Label>
                        <EditableValue value={years} onChange={setYears} min={1} max={5} />
                      </div>
                      <Slider value={[years]} onValueChange={([v]) => setYears(v)} min={1} max={5} step={1} />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {years === 1
                          ? '1 année incluse dans votre abonnement'
                          : `1 année incluse + ${years - 1} année${years - 1 > 1 ? 's' : ''} supplémentaire${years - 1 > 1 ? 's' : ''} (payante${years - 1 > 1 ? 's' : ''})`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modules complémentaires */}
              <Card className="border border-border shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-1">Modules complémentaires</h2>
                  <p className="text-xs text-muted-foreground mb-5">Activez les fonctionnalités dont vous avez besoin.</p>

                  <div className="divide-y divide-border">
                    {addons.map((addon) => {
                      const Icon = addon.icon;
                      return (
                        <div key={addon.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${addon.enabled ? 'bg-primary/15' : 'bg-muted'}`}>
                            <Icon className={`h-4 w-4 ${addon.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{addon.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{addon.benefit}</p>
                          </div>
                          <Switch checked={addon.enabled} onCheckedChange={() => toggleAddon(addon.id)} className="flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT — Sticky Summary */}
            <div className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
              <Card className="border-2 border-primary shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-primary px-6 py-5 text-primary-foreground">
                  <h3 className="text-lg font-bold">Votre plan sur mesure</h3>
                  <p className="text-sm opacity-90 mt-1">Configuration personnalisée</p>
                </div>

                <CardContent className="p-6">
                  {!formSent ? (
                    <>
                      {/* Summary of selections */}
                      <div className="mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Votre sélection</p>
                        <div className="space-y-2">
                          {summaryItems.map((item, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                       <div className="border-t border-border pt-5">
                        {!showForm ? (
                          <div className="text-center space-y-4">
                            {hasCustomized && (
                              <div className="bg-primary/5 rounded-lg p-4">
                                <p className="text-sm font-semibold text-foreground mb-1">Votre plan est spécifique</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Recevez une offre détaillée et personnalisée.
                                </p>
                              </div>
                            )}
                            <Button
                              onClick={() => setShowForm(true)}
                              className="w-full h-12 font-semibold text-base"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Découvrir mon offre
                            </Button>
                            <p className="text-[10px] text-muted-foreground">
                              Sans engagement
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Vos coordonnées
                            </p>
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setIsSubmitting(true);
                                try {
                                  const configSummary = `Entités: ${entities}, Sites: ${sitesPerEntity.join(',')}, Collaborateurs: ${collaborators}, CA: ${revenue}M, Années: ${years}, Modules: ${enabledAddons.map(a => a.name).join(', ') || 'Aucun'}`;
                                  await api.submitLead({
                                    requestType: 'pricing',
                                    email: formData.email,
                                    companyName: formData.company,
                                    phone: formData.phone || undefined,
                                    fullName: formData.name,
                                    message: `Demande de prix - ${formData.name}\n${configSummary}`,
                                    payload: { config: configSummary },
                                  });

                                  setFormSent(true);
                                  toast({ title: 'Demande envoyée ✓', description: 'Vous recevrez votre offre sous 48h.' });
                                } catch (err) {
                                  console.error('Error submitting pricing request:', err);
                                  toast({ title: 'Erreur', description: "Impossible d'envoyer la demande. Réessayez.", variant: 'destructive' });
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                              className="space-y-3"
                            >
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  required
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                  placeholder="Nom complet *"
                                  className="pl-9 h-10"
                                />
                              </div>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  required
                                  value={formData.company}
                                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                  placeholder="Entreprise *"
                                  className="pl-9 h-10"
                                />
                              </div>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  required
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                  placeholder="Email professionnel *"
                                  className="pl-9 h-10"
                                />
                              </div>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  value={formData.phone}
                                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                  placeholder="Téléphone"
                                  className="pl-9 h-10"
                                />
                              </div>
                              <Button type="submit" className="w-full h-11 font-semibold" disabled={isSubmitting}>
                                <Send className="h-4 w-4 mr-2" />
                                {isSubmitting ? 'Envoi en cours...' : 'Recevoir mon offre'}
                              </Button>
                              <p className="text-[10px] text-muted-foreground text-center">
                                Réponse sous 48h • Sans engagement
                              </p>
                            </form>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">Demande envoyée !</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Notre équipe analyse votre configuration et vous enverra une offre personnalisée à{' '}
                        <strong className="text-foreground">{formData.email}</strong> dans les plus brefs délais.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
