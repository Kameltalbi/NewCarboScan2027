import React from 'react';
import { Link } from 'react-router-dom';
import { useVerifierConfig } from './useVerifierConfig';
import { trackEvent } from '@/lib/analytics';
export type VerifierPlacement = 'header' | 'banner' | 'section' | 'slideout' | 'cbam' | 'blog' | 'industry' | 'transport' | 'footer';
export function VerifierLink({ placement, children, className, onClick }: { placement: VerifierPlacement; children?: React.ReactNode; className?: string; onClick?: () => void }) {
  const verifierConfig = useVerifierConfig();
  return <Link to={verifierConfig.path} className={className} onClick={() => { trackEvent('cbam_verifier_promotion_click', { placement }); onClick?.(); }}>{children ?? verifierConfig.promotions.button}</Link>;
}
export function VerifierCallout({ placement }: { placement: 'industry' | 'transport' | 'blog' }) {
  const verifierConfig = useVerifierConfig();
  return <aside className="container mx-auto max-w-5xl px-4 py-8"><div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
    <h2 className="text-xl font-bold text-foreground">{verifierConfig.promotions.sectorTitle}</h2>
    <p className="mt-3 text-muted-foreground">{verifierConfig.promotions.sectorText}</p>
    <VerifierLink placement={placement} className="mt-5 inline-flex rounded border border-primary px-5 py-3 font-semibold text-primary" />
  </div></aside>;
}
export function VerifierHomeSection() {
  const verifierConfig = useVerifierConfig();
  return <section className="bg-primary/5 py-16"><div className="container mx-auto max-w-5xl px-6">
    <h2 className="text-2xl md:text-3xl font-bold text-foreground">{verifierConfig.promotions.sectionTitle}</h2>
    <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{verifierConfig.promotions.sectionText}</p>
    <VerifierLink placement="section" className="mt-7 inline-flex rounded bg-primary px-6 py-3 font-semibold text-primary-foreground" />
  </div></section>;
}
