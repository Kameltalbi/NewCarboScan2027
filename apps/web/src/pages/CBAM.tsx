import { VerifierLink } from "@/features/cbam-verifier/VerifierLink";
import { verifierConfig } from "@cbam-verifier";
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/seo/SEOHead';
import { SolutionLandingShell } from '@/components/seo/SolutionLandingShell';
import { SolutionRelatedLinks } from '@/components/seo/SolutionRelatedLinks';
import { buildFaqSchema } from '@/config/seo';
import { trackEvent } from '@/lib/analytics';
import content from '@/content/cbam.json';

const blocks = content.blocks;
const sectors = [
  { name: 'Ciment', icon: '🏗️' }, { name: 'Fer et acier', icon: '⚔️' },
  { name: 'Aluminium', icon: '🔧' }, { name: 'Engrais', icon: '🌱' },
  { name: 'Hydrogène', icon: '💨' }, { name: 'Électricité', icon: '⚡' },
];
type CtaKind = 'calculator' | 'expert' | 'whatsapp';
const destinations: Record<CtaKind, string> = {
  calculator: '/cbam-calculator', expert: '/demo', whatsapp: 'https://wa.me/21655053033',
};
const events = {
  calculator: 'cbam_calculator_click', expert: 'cbam_expert_click', whatsapp: 'cbam_whatsapp_click',
} as const;
function Cta({ kind, children, position }: { kind: CtaKind; children: React.ReactNode; position: string }) {
  const click = () => trackEvent(events[kind], { position, page_path: '/cbam' });
  return <Button asChild size="lg" variant={kind === 'calculator' ? 'default' : 'outline'} className="h-auto min-h-11 whitespace-normal text-center">
    {kind === 'whatsapp'
      ? <a href={destinations[kind]} onClick={click} target="_blank" rel="noopener noreferrer">{children}</a>
      : <Link to={destinations[kind]} onClick={click}>{children}</Link>}
  </Button>;
}
function Ctas({ position, final = false }: { position: string; final?: boolean }) {
  return <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4">
    <VerifierLink placement="cbam" className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-center font-semibold text-primary-foreground">{verifierConfig.promotions.cbamButton}</VerifierLink>
    <Cta kind="calculator" position={position}>Estimer mon coût CBAM</Cta>
    <Cta kind="expert" position={position}>{final ? 'Réserver un échange avec un expert' : 'Parler à un expert'}</Cta>
  </div>;
}
function Section({ title, children, id }: { title: React.ReactNode; children: React.ReactNode; id: string }) {
  return <section aria-labelledby={id} className="py-8 md:py-12 border-b border-border">
    <h2 id={id} className="text-2xl md:text-3xl font-bold text-foreground mb-6">{title}</h2>
    <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">{children}</div>
  </section>;
}
const paragraphs = (items: string[]) => items.filter(Boolean).map(text => <p key={text}>{text}</p>);

const CBAM: React.FC = () => (
  <SolutionLandingShell path="/cbam" showRelated={false}>
    <SEOHead path="/cbam" title={content.seo.title} description={content.seo.description} jsonLd={buildFaqSchema(content.faqs)} />
    <div className="bg-gradient-to-br from-slate-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl break-words">
        <section aria-labelledby="cbam-h1" className="pb-10 md:pb-16">
          <h2 className="sr-only">En-tête</h2>
          <Badge className="mb-5 bg-blue-100 text-blue-800 px-4 py-2 text-sm whitespace-normal">{content.seo.badge}</Badge>
          <h1 id="cbam-h1" className="text-3xl md:text-5xl font-bold text-foreground leading-tight">{content.seo.h1}</h1>
          <p className="mt-4 text-sm text-muted-foreground">Mis à jour le <time dateTime="2026-10-26">{content.seo.updated}</time></p>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">{blocks['1'].paragraphs.find(p => p.startsWith('Introduction : '))?.replace('Introduction : ', '')}</p>
          <Ctas position="hero" />
        </section>

        <Section id="cbam-bref" title={blocks['2'].title}>{paragraphs(blocks['2'].paragraphs)}</Section>

        <Section id="cbam-secteurs" title={<Link className="underline decoration-primary/40 underline-offset-4" to="/bilan-carbone-industrie">{blocks['3'].title}</Link>}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 not-prose">
            {sectors.map(sector => <div key={sector.name} className="rounded-lg border border-border bg-card p-4 text-center text-foreground"><span className="block text-3xl mb-2" aria-hidden="true">{sector.icon}</span><span className="font-semibold">{sector.name}</span></div>)}
          </div>
          {paragraphs(blocks['3'].paragraphs)}
          <Cta kind="expert" position="sectors">Parler à un expert</Cta>
        </Section>

        <Section id="cbam-calendrier" title={blocks['4'].title}>
          <div role="table" aria-label="Calendrier CBAM" className="rounded-lg border border-border overflow-hidden text-base">
            <div role="row" className="hidden sm:grid sm:grid-cols-[11rem_1fr] bg-muted font-semibold text-foreground">
              <div role="columnheader" className="p-4">Date</div><div role="columnheader" className="p-4">Ce qui se passe</div>
            </div>
            {[0, 1, 2, 3, 4].map(index => <div role="row" key={index} className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] border-t border-border bg-card">
              <div role="cell" className="p-4 pb-1 sm:pb-4 font-semibold text-foreground">{blocks['4'].paragraphs[2 + index * 2]}</div>
              <div role="cell" className="p-4 pt-1 sm:pt-4">{blocks['4'].paragraphs[3 + index * 2]}</div>
            </div>)}
          </div>
          <p>{blocks['4'].paragraphs[12]}</p>
        </Section>

        <Section id="cbam-donnees" title={blocks['5'].title}>
          <p>{blocks['5'].paragraphs[0]}</p>
          <ul className="list-disc pl-6 space-y-3">{blocks['5'].paragraphs.slice(1, 6).map(text => <li key={text}>{text}</li>)}</ul>
          <p>{blocks['5'].paragraphs[6]}</p>
        </Section>

        <Section id="cbam-valeurs-defaut" title={blocks['6'].title}>{paragraphs(blocks['6'].paragraphs)}</Section>
        <Section id="cbam-plan" title={blocks['7'].title}>
          <ol className="list-decimal pl-6 space-y-3">{blocks['7'].paragraphs.map(text => <li key={text}>{text}</li>)}</ol>
        </Section>
        <Section id="cbam-accompagnement" title={blocks['8'].title}>
          {paragraphs(blocks['8'].paragraphs.filter(p => !p.startsWith('Bouton :')))}
          <Cta kind="calculator" position="support">Estimer mon coût CBAM</Cta>
        </Section>
        <Section id="cbam-pourquoi" title={blocks['9'].title}>{paragraphs(blocks['9'].paragraphs)}</Section>
        <Section id="cbam-echange" title={blocks['10'].paragraphs[0].replace('Titre : ', '')}>
          <p>{blocks['10'].paragraphs[1].replace('Texte : ', '')}</p>
          <Ctas position="final" final />
        </Section>
        <Section id="cbam-faq" title="Questions fréquentes sur le CBAM">
          <div className="space-y-7">
            {content.faqs.map((faq, index) => <article key={faq.question} className="rounded-lg border border-border bg-card p-5 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3">{index === 5 ? <Link className="underline underline-offset-4" to="/bilan-carbone">{faq.question}</Link> : faq.question}</h3>
              <p className="whitespace-pre-line">{faq.answer}</p>
            </article>)}
          </div>
          {paragraphs(content.faqNotes)}
          <Cta kind="whatsapp" position="faq">Contacter CarboScan sur WhatsApp</Cta>
          <p><Link className="text-primary underline underline-offset-4" to="/blog/guide-cbam-conformite-carbone-pme">Lire notre guide CBAM pour la conformité carbone des PME</Link></p>
        </Section>
      </div>
    </div>
    <SolutionRelatedLinks currentPath="/cbam" showModules={false} sectorTitle="Votre secteur, vos enjeux" sectorDescription="Découvrez comment CarboScan s’adapte aux spécificités de votre activité." />
  </SolutionLandingShell>
);
export default CBAM;
