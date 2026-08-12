import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Check, Building2, MapPin, ShoppingCart, Leaf, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuppliers } from "@/hooks/useSuppliers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const steps = [
  { key: 'entreprise', label: 'Entreprise', icon: Building2 },
  { key: 'localisation', label: 'Localisation', icon: MapPin },
  { key: 'achats', label: 'Achats', icon: ShoppingCart },
  { key: 'climat', label: 'Maturité climat', icon: Leaf },
  { key: 'invitation', label: 'Invitation', icon: Send },
];

const purchaseCategories = [
  'Matières premières',
  'Énergie',
  'Transport',
  'Services',
  'Équipements',
  'Alimentation',
  'Construction',
  'Déchets',
];

const countries = [
  { code: 'FR', label: 'France' },
  { code: 'MA', label: 'Maroc' },
  { code: 'SN', label: 'Sénégal' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'TN', label: 'Tunisie' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'DE', label: 'Allemagne' },
  { code: 'CN', label: 'Chine' },
  { code: 'MR', label: 'Mauritanie' },
  { code: 'DZ', label: 'Algérie' },
  { code: 'CM', label: 'Cameroun' },
  { code: 'GA', label: 'Gabon' },
];

interface FormData {
  // Entreprise
  name: string;
  siret: string;
  naf_code: string;
  legal_form: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_role: string;
  // Localisation
  country: string;
  city: string;
  address: string;
  postal_code: string;
  // Achats
  purchase_category: string;
  purchase_subcategory: string;
  annual_spend: string;
  criticality: string;
  scope3_ghg_category: string;
  // Climat
  has_carbon_footprint: boolean;
  has_sbti_target: boolean;
  sbti_target_year: string;
  has_cdp_disclosure: boolean;
  cdp_score: string;
  has_iso14001: boolean;
  has_ecovadis: boolean;
  ecovadis_score: string;
  // Invitation
  send_invitation: boolean;
  invitation_message: string;
  notes: string;
}

const initialFormData: FormData = {
  name: '', siret: '', naf_code: '', legal_form: '',
  contact_name: '', contact_email: '', contact_phone: '', contact_role: '',
  country: 'FR', city: '', address: '', postal_code: '',
  purchase_category: '', purchase_subcategory: '', annual_spend: '', criticality: 'medium', scope3_ghg_category: '1',
  has_carbon_footprint: false, has_sbti_target: false, sbti_target_year: '',
  has_cdp_disclosure: false, cdp_score: '', has_iso14001: false, has_ecovadis: false, ecovadis_score: '',
  send_invitation: true, invitation_message: '', notes: '',
};

export const SupplierAddForm: React.FC = () => {
  const navigate = useNavigate();
  const { createSupplier } = useSuppliers();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (currentStep === 0) return form.name.trim().length > 0;
    if (currentStep === 1) return form.country.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createSupplier.mutateAsync({
        name: form.name.trim(),
        siret: form.siret || null,
        naf_code: form.naf_code || null,
        legal_form: form.legal_form || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        contact_role: form.contact_role || null,
        country: form.country,
        city: form.city || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        purchase_category: form.purchase_category || null,
        purchase_subcategory: form.purchase_subcategory || null,
        annual_spend: form.annual_spend ? parseFloat(form.annual_spend) : null,
        criticality: form.criticality as any,
        scope3_ghg_category: parseInt(form.scope3_ghg_category) || 1,
        has_carbon_footprint: form.has_carbon_footprint,
        has_sbti_target: form.has_sbti_target,
        sbti_target_year: form.sbti_target_year ? parseInt(form.sbti_target_year) : null,
        has_cdp_disclosure: form.has_cdp_disclosure,
        cdp_score: form.cdp_score || null,
        has_iso14001: form.has_iso14001,
        has_ecovadis: form.has_ecovadis,
        ecovadis_score: form.ecovadis_score ? parseInt(form.ecovadis_score) : null,
        engagement_status: form.send_invitation ? 'invited' : 'not_contacted',
        notes: form.notes || null,
      } as any);
      navigate('/app/fournisseurs');
    } catch {
      // error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-[500px]">
      {/* Back link */}
      <button
        onClick={() => navigate('/app/fournisseurs')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l'accueil
      </button>

      <div className="flex gap-8">
        {/* Left sidebar - Steps */}
        <div className="hidden md:block w-56 shrink-0">
          <nav className="space-y-1">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStep;
              const isActive = index === currentStep;
              return (
                <button
                  key={step.key}
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                    isActive && "bg-primary/10 text-primary font-medium",
                    isCompleted && "text-foreground",
                    !isActive && !isCompleted && "text-muted-foreground",
                    index <= currentStep && "cursor-pointer hover:bg-muted/50"
                  )}
                  disabled={index > currentStep}
                >
                  <span>{step.label}</span>
                  {isCompleted && <Check className="h-4 w-4 text-emerald-500 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 max-w-2xl">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full flex-1 transition-colors",
                    i <= currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{currentStep + 1}/{steps.length}</span>
          </div>

          {/* Step content */}
          <div className="space-y-6">
            {currentStep === 0 && (
              <>
                <h2 className="text-2xl font-semibold">Informations de l'entreprise</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="name">Nom de l'entreprise *</Label>
                    <Input id="name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ex: Ciments du Sahel" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="siret">N° d'identification fiscale</Label>
                    <Input id="siret" value={form.siret} onChange={e => update('siret', e.target.value)} placeholder="SIRET, MF, NIF, RC..." className="mt-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">SIRET (France), Matricule Fiscal (Tunisie), NIF, RC…</p>
                  </div>
                  <div>
                    <Label htmlFor="naf_code">Code d'activité</Label>
                    <Input id="naf_code" value={form.naf_code} onChange={e => update('naf_code', e.target.value)} placeholder="NAF, NACE, ISIC..." className="mt-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">NAF (France), NACE (Europe), ISIC (International)</p>
                  </div>
                  <div>
                    <Label htmlFor="legal_form">Forme juridique</Label>
                    <Input id="legal_form" value={form.legal_form} onChange={e => update('legal_form', e.target.value)} placeholder="Ex: SA, SARL, SUARL, GmbH, Ltd" className="mt-1.5" />
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-base font-medium mb-3">Contact principal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contact_name">Nom complet</Label>
                      <Input id="contact_name" value={form.contact_name} onChange={e => update('contact_name', e.target.value)} placeholder="Prénom Nom" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="contact_email">Email</Label>
                      <Input id="contact_email" type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} placeholder="contact@entreprise.com" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="contact_phone">Téléphone</Label>
                      <Input id="contact_phone" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} placeholder="+216 XX XXX XXX" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="contact_role">Fonction</Label>
                      <Input id="contact_role" value={form.contact_role} onChange={e => update('contact_role', e.target.value)} placeholder="Ex: Responsable RSE" className="mt-1.5" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentStep === 1 && (
              <>
                <h2 className="text-2xl font-semibold">Localisation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="country">Pays *</Label>
                    <Select value={form.country} onValueChange={v => update('country', v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="city">Ville</Label>
                    <Input id="city" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Ex: Dakar" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">Code postal</Label>
                    <Input id="postal_code" value={form.postal_code} onChange={e => update('postal_code', e.target.value)} placeholder="Ex: 75001" className="mt-1.5" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input id="address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Rue, numéro, bâtiment..." className="mt-1.5" />
                  </div>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <h2 className="text-2xl font-semibold">Informations d'achats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Catégorie d'achat principale</Label>
                    <Select value={form.purchase_category} onValueChange={v => update('purchase_category', v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchaseCategories.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="purchase_subcategory">Sous-catégorie</Label>
                    <Input id="purchase_subcategory" value={form.purchase_subcategory} onChange={e => update('purchase_subcategory', e.target.value)} placeholder="Ex: Acier et métaux ferreux" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="scope3_ghg_category">Catégorie GHG Scope 3</Label>
                    <Select value={form.scope3_ghg_category} onValueChange={v => update('scope3_ghg_category', v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 — Achats de biens et services</SelectItem>
                        <SelectItem value="2">2 — Biens d'équipement</SelectItem>
                        <SelectItem value="3">3 — Énergie (hors scope 1&2)</SelectItem>
                        <SelectItem value="4">4 — Transport amont</SelectItem>
                        <SelectItem value="5">5 — Déchets générés</SelectItem>
                        <SelectItem value="6">6 — Déplacements professionnels</SelectItem>
                        <SelectItem value="7">7 — Domicile-travail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="annual_spend">Volume d'achats annuel (€)</Label>
                    <Input id="annual_spend" type="number" value={form.annual_spend} onChange={e => update('annual_spend', e.target.value)} placeholder="Ex: 150000" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Criticité fournisseur</Label>
                    <Select value={form.criticality} onValueChange={v => update('criticality', v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Élevée</SelectItem>
                        <SelectItem value="critical">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.annual_spend && form.purchase_category && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4 flex items-start gap-3">
                      <Leaf className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-primary">Estimation préliminaire</p>
                        <p className="text-muted-foreground mt-1">
                          Sur la base d'un ratio monétaire ADEME, ce fournisseur générerait environ{' '}
                          <strong className="text-foreground">
                            {Math.round(parseFloat(form.annual_spend) * 0.45).toLocaleString('fr-FR')} kgCO₂e/an
                          </strong>{' '}
                          (estimation provisoire, à affiner avec des données réelles).
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {currentStep === 3 && (
              <>
                <h2 className="text-2xl font-semibold">Maturité climatique</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Ces informations permettent de calculer le score carbone du fournisseur.
                </p>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Bilan carbone réalisé</p>
                      <p className="text-xs text-muted-foreground">Le fournisseur a déjà réalisé un bilan GES</p>
                    </div>
                    <Switch checked={form.has_carbon_footprint} onCheckedChange={v => update('has_carbon_footprint', v)} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Objectif SBTi (Science-Based Targets)</p>
                      <p className="text-xs text-muted-foreground">Trajectoire de réduction validée SBTi</p>
                    </div>
                    <Switch checked={form.has_sbti_target} onCheckedChange={v => update('has_sbti_target', v)} />
                  </div>
                  {form.has_sbti_target && (
                    <div className="ml-4">
                      <Label htmlFor="sbti_year">Année cible SBTi</Label>
                      <Input id="sbti_year" type="number" value={form.sbti_target_year} onChange={e => update('sbti_target_year', e.target.value)} placeholder="Ex: 2030" className="mt-1.5 w-40" />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Réponse CDP (Carbon Disclosure Project)</p>
                      <p className="text-xs text-muted-foreground">Données publiées auprès du CDP</p>
                    </div>
                    <Switch checked={form.has_cdp_disclosure} onCheckedChange={v => update('has_cdp_disclosure', v)} />
                  </div>
                  {form.has_cdp_disclosure && (
                    <div className="ml-4">
                      <Label>Score CDP</Label>
                      <Select value={form.cdp_score} onValueChange={v => update('cdp_score', v)}>
                        <SelectTrigger className="mt-1.5 w-40"><SelectValue placeholder="Score" /></SelectTrigger>
                        <SelectContent>
                          {['A', 'A-', 'B', 'B-', 'C', 'C-', 'D', 'D-'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Certification ISO 14001</p>
                      <p className="text-xs text-muted-foreground">Système de management environnemental</p>
                    </div>
                    <Switch checked={form.has_iso14001} onCheckedChange={v => update('has_iso14001', v)} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Évaluation EcoVadis</p>
                      <p className="text-xs text-muted-foreground">Score RSE EcoVadis</p>
                    </div>
                    <Switch checked={form.has_ecovadis} onCheckedChange={v => update('has_ecovadis', v)} />
                  </div>
                  {form.has_ecovadis && (
                    <div className="ml-4">
                      <Label htmlFor="ecovadis_score">Score EcoVadis (0-100)</Label>
                      <Input id="ecovadis_score" type="number" min="0" max="100" value={form.ecovadis_score} onChange={e => update('ecovadis_score', e.target.value)} placeholder="Ex: 65" className="mt-1.5 w-40" />
                    </div>
                  )}
                </div>
              </>
            )}

            {currentStep === 4 && (
              <>
                <h2 className="text-2xl font-semibold">Invitation du fournisseur</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Envoyez une invitation par email pour que le fournisseur complète ses données directement sur la plateforme.
                </p>

                <div className="flex items-center justify-between p-4 rounded-lg border mb-4">
                  <div>
                    <p className="text-sm font-medium">Envoyer une invitation par email</p>
                    <p className="text-xs text-muted-foreground">
                      {form.contact_email ? `À : ${form.contact_email}` : 'Aucun email de contact renseigné'}
                    </p>
                  </div>
                  <Switch 
                    checked={form.send_invitation} 
                    onCheckedChange={v => update('send_invitation', v)}
                    disabled={!form.contact_email}
                  />
                </div>

                {form.send_invitation && form.contact_email && (
                  <div>
                    <Label htmlFor="invitation_message">Message personnalisé (optionnel)</Label>
                    <Textarea 
                      id="invitation_message" 
                      value={form.invitation_message}
                      onChange={e => update('invitation_message', e.target.value)}
                      placeholder="Ajoutez un message personnalisé à l'invitation..."
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>
                )}

                <div className="mt-6">
                  <Label htmlFor="notes">Notes internes</Label>
                  <Textarea 
                    id="notes" 
                    value={form.notes}
                    onChange={e => update('notes', e.target.value)}
                    placeholder="Notes ou commentaires sur ce fournisseur..."
                    className="mt-1.5"
                    rows={3}
                  />
                </div>

                {/* Recap card */}
                <Card className="mt-6 bg-muted/30">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium mb-3">Récapitulatif</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Entreprise :</span> {form.name}</div>
                      <div><span className="text-muted-foreground">Pays :</span> {countries.find(c => c.code === form.country)?.label}</div>
                      {form.purchase_category && <div><span className="text-muted-foreground">Catégorie :</span> {form.purchase_category}</div>}
                      {form.annual_spend && <div><span className="text-muted-foreground">Volume :</span> {parseFloat(form.annual_spend).toLocaleString('fr-FR')} €</div>}
                      <div><span className="text-muted-foreground">Criticité :</span> {form.criticality}</div>
                      {form.contact_email && <div><span className="text-muted-foreground">Contact :</span> {form.contact_email}</div>}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-10 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate('/app/fournisseurs')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="gap-2"
              >
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceed()}
                className="gap-2"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer le fournisseur'}
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
