import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Info, Share2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SCOPES = [
  {
    id: 1,
    title: "Scope 1",
    short: "Directes",
    heading: "Émissions directes",
    color: "#1B7A46",
    soft: "#E8F6EE",
    icon: Flame,
    help: "Ce sont les émissions produites par votre organisation elle-même, avec des équipements ou des véhicules qu’elle détient ou contrôle. La combustion a lieu chez vous.",
    note: "L’électricité achetée au réseau n’entre pas ici : elle relève du Scope 2.",
    helpExamples: "Chaudière, groupe électrogène, carburant des véhicules de l’entreprise, fuites de fluides frigorigènes, procédés industriels.",
  },
  {
    id: 2,
    title: "Scope 2",
    short: "Énergie",
    heading: "Énergie achetée",
    color: "#1A6B74",
    soft: "#E6F4F5",
    icon: Zap,
    help: "Ce sont les émissions liées à la production de l’énergie que vous achetez et consommez. L’énergie est produite ailleurs, mais c’est votre organisation qui l’utilise.",
    note: "Le carburant brûlé dans vos propres véhicules reste au Scope 1.",
    helpExamples: "Électricité du réseau, chaleur, vapeur ou froid achetés.",
  },
  {
    id: 3,
    title: "Scope 3",
    short: "Indirectes",
    heading: "Autres émissions indirectes",
    color: "#C04E12",
    soft: "#FDEFE6",
    icon: Share2,
    help: "Ce sont les autres émissions de votre chaîne de valeur, en amont et en aval. Elles ne viennent ni d’une source que vous contrôlez directement, ni de l’énergie achetée du Scope 2.",
    note: "Elles concernent vos fournisseurs, le transport, les déplacements et ce qu’il advient de vos produits après la vente.",
    helpExamples: "Achats, transport de marchandises, déplacements professionnels, trajets domicile-travail, déchets et utilisation des produits vendus.",
  },
] as const;

export const ScopeChoice: React.FC = () => {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Ajouter une donnée d’activité</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choisissez le scope correspondant à votre donnée.</p>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
        {SCOPES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/app/collecte/nouvelle/scope/${item.id}`)}
              className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-5 text-center shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-[color:var(--scope)] hover:bg-[var(--scope-soft)] hover:shadow-md focus-visible:border-[color:var(--scope)] focus-visible:bg-[var(--scope-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              style={{ "--scope": item.color, "--scope-soft": item.soft } as React.CSSProperties}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: item.soft, color: item.color }}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>
                <span className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                  {item.title}
                  <span
                    className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.id}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.short}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        Comprendre les scopes
      </button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto sm:w-full">
          <DialogHeader className="space-y-2 pr-8 text-left">
            <DialogTitle>Comprendre les scopes</DialogTitle>
            <DialogDescription>
              Les émissions de gaz à effet de serre sont réparties en trois groupes appelés scopes. Le scope dépend de qui détient ou contrôle la source, pas du nom du facteur d’émission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {SCOPES.map((item) => {
              const Icon = item.icon;
              return (
                <section key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: item.soft, color: item.color }}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 space-y-2">
                      <h2 className="text-sm font-semibold leading-snug">
                        {item.title} — {item.heading}
                      </h2>
                      <p className="text-sm leading-relaxed">{item.help}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{item.note}</p>
                      <p className="text-sm leading-relaxed">Exemples : {item.helpExamples}</p>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Fermer</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
