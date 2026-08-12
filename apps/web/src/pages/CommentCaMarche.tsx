import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Database, FileSpreadsheet, Calculator, TrendingUp, CheckCircle2, Upload, FileText } from 'lucide-react';

const STEP_ICONS = [Database, Database, Calculator, TrendingUp];
const MODE_ICONS = [Calculator, FileText, FileSpreadsheet, Upload];
const MODE_COLORS = ['text-primary', 'text-blue-600', 'text-green-600', 'text-purple-600'];

export const CommentCaMarche: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const steps = t('commentCaMarche.steps', { returnObjects: true }) as { title: string; description: string; features: string[] }[];
  const modes = t('commentCaMarche.modes', { returnObjects: true }) as { title: string; description: string }[];
  const benefits = t('commentCaMarche.benefits.items', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t('commentCaMarche.hero.title')}</h1>
          <p className="text-xl text-muted-foreground mb-8">{t('commentCaMarche.hero.subtitle')}</p>
          <Button size="lg" onClick={() => navigate('/app/collecte')} className="text-lg px-8">
            {t('commentCaMarche.hero.cta')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t('commentCaMarche.stepsTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? Database;
              return (
                <Card key={i} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">{t('commentCaMarche.stepLabel', { number: i + 1 })}</div>
                        <CardTitle>{step.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <ul className="space-y-2">
                      {step.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{t('commentCaMarche.modesTitle')}</h2>
          <p className="text-center text-muted-foreground mb-12">{t('commentCaMarche.modesSubtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modes.map((mode, index) => {
              const Icon = MODE_ICONS[index] ?? Calculator;
              return (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                      <Icon className={`h-8 w-8 ${MODE_COLORS[index] ?? 'text-primary'}`} />
                    </div>
                    <CardTitle className="text-lg">{mode.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t('commentCaMarche.benefits.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold mb-4">{t('commentCaMarche.finalCta.title')}</h2>
              <p className="text-lg text-muted-foreground mb-8">{t('commentCaMarche.finalCta.subtitle')}</p>
              <Button size="lg" onClick={() => navigate('/app/collecte')} className="text-lg px-8">
                {t('commentCaMarche.hero.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};
