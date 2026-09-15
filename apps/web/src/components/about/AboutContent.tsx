import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SafeHtml } from "@/components/SafeHtml";

const FEATURE_ICONS = [TrendingDown, Target, BarChart3];

export const AboutContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const strategyBullets = t('aboutPage.strategy.bullets', { returnObjects: true }) as string[];
  const features = t('aboutPage.intelligence.items', { returnObjects: true }) as { title: string; description: string }[];
  const comparisonRows = t('aboutPage.comparison.rows', { returnObjects: true }) as { without: string; with: string }[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="relative py-24 px-4 md:px-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight whitespace-pre-line">
              {t('aboutPage.hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('aboutPage.hero.subtitle')}
            </p>
          </div>
          <div className="flex justify-center">
            <Button size="lg" onClick={() => navigate('/contact')} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
              {t('aboutPage.hero.cta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-10 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t('aboutPage.strategy.title')}</h2>
              <SafeHtml
                className="text-lg text-muted-foreground mb-6 leading-relaxed"
                html={t('aboutPage.strategy.description')}
              />
              <ul className="space-y-4">
                {strategyBullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/50 rounded-2xl p-8 border border-border">
              <BarChart3 className="h-16 w-16 text-primary mb-4" />
              <div className="space-y-4">
                <div className="h-4 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-3/4 rounded-full" />
                </div>
                <div className="h-4 bg-accent/20 rounded-full overflow-hidden">
                  <div className="h-full bg-accent w-1/2 rounded-full" />
                </div>
                <div className="h-4 bg-secondary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-2/3 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t('aboutPage.intelligence.title')}</h2>
            <SafeHtml
              className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed"
              html={t('aboutPage.intelligence.description')}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? Target;
              return (
                <div key={i} className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow">
                  <Icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-3">{f.title}</h3>
                  <p className="text-muted-foreground">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-10 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">{t('aboutPage.results.title')}</h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">{t('aboutPage.results.subtitle')}</p>
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 md:p-12 border border-border">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">{t('aboutPage.results.trajectory')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-primary">-45%</div>
                    <div className="text-sm text-muted-foreground">{t('aboutPage.results.trajectoryHint')}</div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 w-full rounded-full" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">{t('aboutPage.results.impact')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-32 text-sm text-muted-foreground">{t('aboutPage.results.energy')}</div>
                    <div className="flex-1 h-8 bg-primary/20 rounded-lg overflow-hidden">
                      <div className="h-full bg-primary w-3/4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 text-sm text-muted-foreground">{t('aboutPage.results.mobility')}</div>
                    <div className="flex-1 h-8 bg-accent/20 rounded-lg overflow-hidden">
                      <div className="h-full bg-accent w-1/2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 text-sm text-muted-foreground">{t('aboutPage.results.purchases')}</div>
                    <div className="flex-1 h-8 bg-secondary/20 rounded-lg overflow-hidden">
                      <div className="h-full bg-secondary w-2/3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">{t('aboutPage.comparison.title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-4 px-6 text-lg font-semibold text-muted-foreground">{t('aboutPage.comparison.withoutHead')}</th>
                  <th className="text-left py-4 px-6 text-lg font-semibold text-primary">{t('aboutPage.comparison.withHead')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-6 text-muted-foreground">{row.without}</td>
                    <td className="py-4 px-6 font-medium text-foreground">{row.with}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12 text-center">
            <SafeHtml
              className="text-xl text-foreground font-semibold"
              html={t('aboutPage.comparison.summary')}
            />
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-10 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <Target className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t('aboutPage.netZero.title')}</h2>
          <SafeHtml
            className="text-lg text-muted-foreground leading-relaxed"
            html={t('aboutPage.netZero.description')}
          />
        </div>
      </section>

      <section className="py-20 px-4 md:px-10 bg-card">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t('aboutPage.finalCta.title')}</h2>
          <p className="text-xl text-muted-foreground mb-8">{t('aboutPage.finalCta.subtitle')}</p>
          <Button size="lg" onClick={() => navigate('/contact')} className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 text-xl font-semibold shadow-xl hover:shadow-2xl transition-all">
            {t('aboutPage.finalCta.cta')}
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
          <p className="text-sm text-muted-foreground mt-6">{t('aboutPage.finalCta.footnote')}</p>
        </div>
      </section>
    </div>
  );
};
