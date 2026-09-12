import React from 'react';
import { useTranslation } from 'react-i18next';
import { HomeHeader } from '@/components/HomeHeader';
import { NewFooter } from '@/components/NewFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs';
import { SolutionFaq, type FaqItem } from '@/components/seo/SolutionFaq';
import { SolutionRelatedLinks } from '@/components/seo/SolutionRelatedLinks';

interface SectorLandingProps {
  /** i18n key under `sectorLandings.<sectorKey>` containing sector, title, metaTitle, metaDescription, heroDescription, stats[], challenges[] */
  sectorKey: string;
  sectorSlug: string;
  /** Benefit icons (content translated via i18n) */
  benefitIcons: React.ReactNode[];
}

export const SectorLanding: React.FC<SectorLandingProps> = ({ sectorKey, sectorSlug, benefitIcons }) => {
  const { t } = useTranslation();
  const base = `sectorLandings.${sectorKey}`;
  const path = `/bilan-carbone-${sectorSlug}`;

  const sector = t(`${base}.sector`);
  const stats = t(`${base}.stats`, { returnObjects: true }) as { value: string; label: string }[];
  const challenges = t(`${base}.challenges`, { returnObjects: true }) as { title: string; description: string }[];
  const benefits = t(`${base}.benefits`, { returnObjects: true }) as { title: string; description: string }[];
  const faqs = t(`${base}.faqs`, { returnObjects: true }) as FaqItem[];
  const faqList = Array.isArray(faqs) ? faqs : [];

  return (
    <>
      <HomeHeader />

      <main id="main-content">
        <section className="bg-gradient-hero py-20 lg:py-28">
          <div className="container mx-auto px-4 max-w-6xl">
            <MarketingBreadcrumbs
              items={[
                { name: 'Accueil', path: '/' },
                { name: 'Solutions', path: '/solutions' },
                { name: sector },
              ]}
            />
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                {t('sectorLandings.common.sectorPill', { sector })}
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                {t(`${base}.title`)}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {t(`${base}.heroDescription`)}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link to="/bilan-gratuit">
                    {t('sectorLandings.common.freeAssessment')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/demo">{t('sectorLandings.common.requestDemo')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-card border-y border-border">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {Array.isArray(stats) && stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              {t('sectorLandings.common.challengesTitle', { sector })}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(challenges) && challenges.map((c, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-2">{c.title}</h3>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              {t('sectorLandings.common.benefitsTitle', { sector })}
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {Array.isArray(benefits) && benefits.map((b, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {benefitIcons[i]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SolutionFaq faqs={faqList} path={path} />
        <SolutionRelatedLinks currentPath={path} />

        <section className="py-20">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {t('sectorLandings.common.ctaTitle')}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('sectorLandings.common.ctaSubtitle', { sector })}
            </p>
            <Button asChild size="lg">
              <Link to="/bilan-gratuit">
                {t('sectorLandings.common.startFree')}
                <Leaf className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <NewFooter />
    </>
  );
};
