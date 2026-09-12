import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Leaf, Package, Check, ShieldCheck, Users, FileText, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import contactCardAsset from '@/assets/pricing-contact-card.jpg.asset.json';

interface Offer {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  features: string[];
  popular?: boolean;
}

const offers: Offer[] = [
  {
    id: 'carbone',
    name: 'Bilan Carbone',
    icon: BarChart3,
    description: 'Mesurez vos émissions GES et identifiez vos principaux leviers de réduction.',
    features: [
      'Scopes 1, 2 et 3 (GHG Protocol)',
      'Collecte de données guidée',
      'Rapports PDF & Excel conformes',
      'Suivi pluriannuel de vos progrès',
    ],
    popular: true,
  },
  {
    id: 'acv',
    name: 'ACV & Empreinte Produit',
    icon: Leaf,
    description: 'Évaluez les impacts du cycle de vie de vos produits, de la matière à la fin de vie.',
    features: [
      'Analyse multi-indicateurs (ISO 14040/44)',
      'Empreinte produit ISO 14067',
      'Éco-conception et scénarios',
      'Rapports produits clients-ready',
    ],
  },
  {
    id: 'conformite',
    name: 'Conformité & Reporting',
    icon: Package,
    description: 'Anticipez CBAM, CSRD et exigences donneurs d\'ordre depuis une seule plateforme.',
    features: [
      'Module CBAM export UE',
      'Trajectoire Net Zéro',
      'Reporting consolidé multi-sites',
      'Gestion fournisseurs & chaîne de valeur',
    ],
  },
];

const included = [
  { icon: Users, label: 'Utilisateurs multiples', text: 'Collaboration entre vos services et vos sites.' },
  { icon: FileText, label: 'Rapports illimités', text: 'Générez vos bilans et exports quand vous le souhaitez.' },
  { icon: ShieldCheck, label: 'Données sécurisées', text: 'Chiffrement, cloisonnement strict par organisation.' },
  { icon: Headphones, label: 'Accompagnement', text: 'Formation, audit et conseil par nos experts.' },
];

const faq = [
  {
    q: 'Comment est calculé le tarif ?',
    a: "Le tarif dépend du périmètre : nombre d'entités et de sites, modules activés et niveau d'accompagnement souhaité. Nous construisons une offre sur mesure après un échange de 30 minutes.",
  },
  {
    q: 'Puis-je commencer par un seul module ?',
    a: 'Oui. La majorité de nos clients démarrent par le Bilan Carbone puis activent progressivement ACV, CBAM ou Net Zéro selon leurs obligations.',
  },
  {
    q: 'Les tarifs sont-ils en dinars tunisiens ?',
    a: 'Oui, nos offres sont facturées en TND pour la Tunisie, et en EUR ou USD pour nos clients internationaux.',
  },
  {
    q: 'Proposez-vous un accompagnement humain ?',
    a: "Oui. Chaque abonnement inclut un accompagnement, et nous proposons des prestations complémentaires de conseil, d'audit et de formation.",
  },
];

export const GreenlyPricingPage: React.FC = () => {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="pt-20 pb-12 text-center">
        <div className="container mx-auto px-4 max-w-3xl">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-5">
            Tarifs
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6">
            Une plateforme, tous vos enjeux carbone
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Mesurez, réduisez vos émissions et accélérez votre mise en conformité depuis une seule plateforme.
          </p>
        </div>
      </section>

      {/* Offers */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-2 max-w-7xl mx-auto">
            {offers.map((offer) => {
              const Icon = offer.icon;
              return (
                <div
                  key={offer.id}
                  className={`relative rounded-2xl p-7 flex flex-col ${
                    offer.popular
                      ? 'bg-primary/5 border-2 border-primary/40'
                      : 'bg-muted/60 border border-border'
                  }`}
                >
                  {offer.popular && (
                    <span className="absolute -top-3 left-7 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Le plus populaire
                    </span>
                  )}

                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{offer.name}</h2>
                  </div>

                  <p className="text-muted-foreground mb-7 leading-relaxed">{offer.description}</p>

                  <Button
                    asChild
                    variant={offer.popular ? 'default' : 'outline'}
                    size="lg"
                    className="w-full rounded-[4px] font-semibold group"
                  >
                    <Link to="/demo-steps">
                      Contactez-nous
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>

                  <div className="h-px bg-border my-7" />

                  <ul className="space-y-4">
                    {offer.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {/* Dark contact card */}
            <div className="relative rounded-2xl overflow-hidden min-h-[420px] flex flex-col">
              <img
                src={contactCardAsset.url}
                alt="Espace de travail CarboScan avec un dashboard d'émissions carbone"
                loading="lazy"
                width={800}
                height={1200}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/90 via-foreground/60 to-foreground/20" />
              <div className="relative p-7">
                <h2 className="text-2xl font-bold text-background mb-4">Tarif détaillé</h2>
                <p className="text-background/85 mb-7 leading-relaxed">
                  Vous souhaitez un tarif détaillé ou une offre adaptée à votre organisation ?
                </p>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full rounded-[4px] font-semibold bg-transparent border-background/60 text-background hover:bg-background hover:text-foreground group"
                >
                  <Link to="/demo-steps">
                    Contactez-nous
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8 max-w-3xl mx-auto">
            Chaque offre est construite sur mesure en fonction de votre périmètre : entités, sites, modules et
            accompagnement.
          </p>
        </div>
      </section>

      {/* Included */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-14">
            Inclus dans toutes les offres
          </h2>
          <div className="grid gap-8 md:grid-cols-4">
            {included.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto rounded-3xl bg-primary text-primary-foreground px-8 py-14 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Parlons de votre projet climat</h2>
            <p className="text-primary-foreground/85 text-lg mb-8 max-w-2xl mx-auto">
              30 minutes suffisent pour cadrer votre périmètre et vous proposer une offre chiffrée.
            </p>
            <Button asChild size="lg" variant="secondary" className="rounded-[4px] font-semibold px-8">
              <Link to="/demo-steps">
                Demander un devis
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
