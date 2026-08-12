import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 6;

const SIZES = ["1-9", "10-49", "50-249", "250-999", "1000+"];

const SECTORS = [
  "Agroalimentaire",
  "Industrie",
  "Construction & Immobilier",
  "Finance & Assurance",
  "Retail & E-Commerce",
  "Logistique & Mobilité",
  "Énergie & Environnement",
  "Santé",
  "Conseil & Services",
  "Technologie & IT",
  "Secteur public & Éducation",
  "Autre",
];

const NEEDS = [
  "Bilan Carbone (Scopes 1, 2, 3)",
  "Empreinte produit (ACV / PCF)",
  "CBAM / Export UE",
  "Reporting CSRD / ESG",
  "Plan d'action & trajectoire",
  "Accompagnement / formation",
];

const ROLES = [
  "Direction générale",
  "RSE / Développement durable",
  "QHSE / Technique",
  "Finance",
  "Achats",
  "Autre",
];

const TIMELINES = [
  "Immédiat (< 1 mois)",
  "Ce trimestre",
  "Cette année",
  "Exploration / veille",
];

interface FormState {
  company: string;
  size: string;
  sector: string;
  needs: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  timeline: string;
}

const initialState: FormState = {
  company: "",
  size: "",
  sector: "",
  needs: [],
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
  timeline: "",
};

const OptionCard: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 rounded-xl border px-5 py-4 text-left transition-all",
      selected
        ? "border-primary bg-primary/5 text-primary shadow-sm"
        : "border-border bg-muted/40 hover:bg-muted"
    )}
  >
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        selected ? "border-primary" : "border-muted-foreground/40"
      )}
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
    </span>
    <span className="text-base font-medium">{label}</span>
  </button>
);

export const DemoStepsWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleNeed = (need: string) =>
    setForm((f) => ({
      ...f,
      needs: f.needs.includes(need)
        ? f.needs.filter((n) => n !== need)
        : [...f.needs, need],
    }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const canContinue = (() => {
    switch (step) {
      case 1:
        return form.company.trim().length >= 2;
      case 2:
        return !!form.size && !!form.sector;
      case 3:
        return form.needs.length > 0;
      case 4:
        return form.firstName.trim().length >= 2 && form.lastName.trim().length >= 2;
      case 5:
        return emailValid && form.phone.trim().length >= 6;
      case 6:
        return !!form.role && !!form.timeline;
      default:
        return false;
    }
  })();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const message = [
        `Demande de démo — ${form.company.trim()}`,
        `Contact : ${form.firstName.trim()} ${form.lastName.trim()} (${form.role})`,
        `Taille : ${form.size} · Secteur : ${form.sector}`,
        `Besoins : ${form.needs.join(", ")}`,
        `Échéance : ${form.timeline}`,
      ].join("\n");

      await api.submitLead({
        requestType: "demo",
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyName: form.company.trim(),
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        message,
        payload: {
          size: form.size,
          sector: form.sector,
          needs: form.needs,
          timeline: form.timeline,
          role: form.role,
        },
      });
      setDone(true);
    } catch (e) {
      toast.error("Une erreur est survenue. Merci de réessayer ou de nous écrire à contact@carboscan.io");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center">
        <CheckCircle2 className="mb-6 h-16 w-16 text-primary" />
        <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
          Félicitations, vous êtes sur le point d'engager votre entreprise
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Votre demande nous est parvenue. Notre équipe vous recontacte sous 24&nbsp;h
          ouvrées pour organiser votre démonstration CarboScan.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link to="/pricing">Découvrir nos offres</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/blog">Lire nos ressources</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      {/* Progress */}
      <div className="mb-14 flex items-center gap-4">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-muted-foreground">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-8">
          <h2 className="text-center text-3xl font-bold">Quelle est votre entreprise ?</h2>
          <Input
            autoFocus
            placeholder="Nom de votre entreprise"
            value={form.company}
            maxLength={120}
            onChange={(e) => set("company", e.target.value)}
            className="h-14 text-base"
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          <h2 className="text-center text-3xl font-bold">Parlez-nous de votre structure</h2>
          <div className="space-y-2">
            <Label>Effectif</Label>
            <Select value={form.size} onValueChange={(v) => set("size", v)}>
              <SelectTrigger className="h-14">
                <SelectValue placeholder="Sélectionnez une taille" />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} salariés
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Secteur d'activité</Label>
            <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
              <SelectTrigger className="h-14">
                <SelectValue placeholder="Sélectionnez un secteur" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8">
          <h2 className="text-center text-3xl font-bold">Quels sont vos besoins ?</h2>
          <p className="-mt-4 text-center text-muted-foreground">
            Plusieurs réponses possibles
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {NEEDS.map((n) => (
              <OptionCard
                key={n}
                label={n}
                selected={form.needs.includes(n)}
                onClick={() => toggleNeed(n)}
              />
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-8">
          <h2 className="text-center text-3xl font-bold">Quel est votre nom ?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input
                autoFocus
                value={form.firstName}
                maxLength={60}
                onChange={(e) => set("firstName", e.target.value)}
                className="h-14"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={form.lastName}
                maxLength={60}
                onChange={(e) => set("lastName", e.target.value)}
                className="h-14"
              />
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-8">
          <h2 className="text-center text-3xl font-bold">Comment vous joindre ?</h2>
          <div className="space-y-2">
            <Label>Email professionnel</Label>
            <Input
              autoFocus
              type="email"
              placeholder="prenom.nom@entreprise.com"
              value={form.email}
              maxLength={255}
              onChange={(e) => set("email", e.target.value)}
              className="h-14"
            />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input
              type="tel"
              placeholder="+216 ..."
              value={form.phone}
              maxLength={30}
              onChange={(e) => set("phone", e.target.value)}
              className="h-14"
            />
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-8">
          <h2 className="text-center text-3xl font-bold">Votre rôle et votre échéance</h2>
          <div className="space-y-3">
            <Label>Quel poste occupez-vous ?</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {ROLES.map((r) => (
                <OptionCard
                  key={r}
                  label={r}
                  selected={form.role === r}
                  onClick={() => set("role", r)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>Quand souhaitez-vous démarrer ?</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {TIMELINES.map((t) => (
                <OptionCard
                  key={t}
                  label={t}
                  selected={form.timeline === t}
                  onClick={() => set("timeline", t)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-12 flex justify-center gap-4">
        {step > 1 && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep((s) => s - 1)}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        )}
        <Button
          size="lg"
          disabled={!canContinue || loading}
          onClick={() => (step === TOTAL_STEPS ? handleSubmit() : setStep((s) => s + 1))}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {step === TOTAL_STEPS ? "Envoyer ma demande" : "Suivant"}
          {step < TOTAL_STEPS && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
