import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HomeHeader } from "@/components/HomeHeader";
import { NewFooter } from "@/components/NewFooter";
import { MarketingBreadcrumbs } from "@/components/seo/MarketingBreadcrumbs";
import { SolutionRelatedLinks } from "@/components/seo/SolutionRelatedLinks";
import { Target, Users, Cog, BarChart3, Lightbulb, Zap, Car, ShoppingCart, Recycle, GraduationCap, ArrowRight } from "lucide-react";

const SolutionsSupport: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const levers = [
    { icon: Zap, key: 'energy' },
    { icon: Car, key: 'mobility' },
    { icon: ShoppingCart, key: 'purchases' },
    { icon: Recycle, key: 'waste' },
    { icon: GraduationCap, key: 'culture' }
  ];

  return (
    <div className="min-w-full bg-background">
      <HomeHeader />
      <main id="main-content">
        <div className="container mx-auto px-4 pt-6 max-w-5xl">
          <MarketingBreadcrumbs
            items={[
              { name: "Accueil", path: "/" },
              { name: "Solutions", path: "/solutions" },
              { name: "Accompagnement" },
            ]}
          />
        </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#00A7A7] to-[#4DD0AE] text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            {t('solutions.support.hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-center max-w-4xl mx-auto opacity-95 leading-relaxed">
            {t('solutions.support.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">
            {t('solutions.support.approach.title')}
          </h2>

          {/* Step 1: Analysis */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="flex items-start gap-6 mb-8">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#00A7A7] to-[#4DD0AE] text-white rounded-2xl flex items-center justify-center">
                <Target className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-card-foreground">
                  {t('solutions.support.approach.step1.title')}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {t('solutions.support.approach.step1.description')}
                </p>
                <ul className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#00A7A7] mt-1">•</span>
                      <span className="text-muted-foreground">{t(`solutions.support.approach.step1.point${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-4 italic">
                  {t('solutions.support.approach.step1.conclusion')}
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Co-construction */}
          <div className="max-w-5xl mx-auto mb-16 bg-muted/30 rounded-2xl p-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#00A7A7] to-[#4DD0AE] text-white rounded-2xl flex items-center justify-center">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-card-foreground">
                  {t('solutions.support.approach.step2.title')}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {t('solutions.support.approach.step2.description')}
                </p>
                <ul className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#00A7A7] mt-1">•</span>
                      <span className="text-muted-foreground">{t(`solutions.support.approach.step2.point${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-4 italic">
                  {t('solutions.support.approach.step2.conclusion')}
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Implementation with Levers */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="flex items-start gap-6 mb-8">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#00A7A7] to-[#4DD0AE] text-white rounded-2xl flex items-center justify-center">
                <Cog className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3 text-card-foreground">
                  {t('solutions.support.approach.step3.title')}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t('solutions.support.approach.step3.description')}
                </p>
              </div>
            </div>

            {/* Levers Grid */}
            <div className="grid md:grid-cols-2 gap-6 pl-0 md:pl-22">
              {levers.map(({ icon: Icon, key }) => (
                <div key={key} className="bg-card rounded-xl p-6 border border-border hover:border-[#00A7A7] transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#00A7A7]/10 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[#00A7A7]" />
                    </div>
                    <h4 className="text-lg font-bold text-card-foreground">
                      {t(`solutions.support.approach.step3.levers.${key}.title`)}
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-[#00A7A7] mt-1">•</span>
                        <span className="text-muted-foreground">
                          {t(`solutions.support.approach.step3.levers.${key}.point${i}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Monitoring */}
          <div className="max-w-5xl mx-auto mb-16 bg-muted/30 rounded-2xl p-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#00A7A7] to-[#4DD0AE] text-white rounded-2xl flex items-center justify-center">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-card-foreground">
                  {t('solutions.support.approach.step4.title')}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {t('solutions.support.approach.step4.description')}
                </p>
                <ul className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#00A7A7] mt-1">•</span>
                      <span className="text-muted-foreground">{t(`solutions.support.approach.step4.point${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-4 italic">
                  {t('solutions.support.approach.step4.conclusion')}
                </p>
              </div>
            </div>
          </div>

          {/* Step 5: Innovation */}
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#00A7A7] to-[#4DD0AE] text-white rounded-2xl flex items-center justify-center">
                <Lightbulb className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-card-foreground">
                  {t('solutions.support.approach.step5.title')}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {t('solutions.support.approach.step5.description')}
                </p>
                <ul className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#00A7A7] mt-1">•</span>
                      <span className="text-muted-foreground">{t(`solutions.support.approach.step5.point${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-4 italic">
                  {t('solutions.support.approach.step5.conclusion')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-[#00A7A7] to-[#4DD0AE] rounded-2xl p-12 text-white">
            <blockquote className="text-2xl md:text-3xl font-bold mb-6 italic">
              {t('solutions.support.finalCta.quote')}
            </blockquote>
            <p className="text-lg mb-8 opacity-95 leading-relaxed">
              {t('solutions.support.finalCta.description')}
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/contact')}
              className="bg-white text-[#00A7A7] hover:bg-gray-100 font-semibold text-lg"
            >
              {t('solutions.support.finalCta.button')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <SolutionRelatedLinks currentPath="/solutions/accompagnement" />
      </main>

      <NewFooter />
    </div>
  );
};

export default SolutionsSupport;
