import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HomeHeader } from "@/components/HomeHeader";
import { NewFooter } from "@/components/NewFooter";
import { MarketingBreadcrumbs } from "@/components/seo/MarketingBreadcrumbs";
import { SolutionRelatedLinks } from "@/components/seo/SolutionRelatedLinks";
import { Flame, Zap, Package, Info } from "lucide-react";

const SolutionsCatalog: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-w-full bg-background">
      <HomeHeader />
      <main id="main-content" className="min-w-full bg-background">
        <div className="container mx-auto px-4 pt-6 max-w-5xl">
          <MarketingBreadcrumbs
            items={[
              { name: "Accueil", path: "/" },
              { name: "Solutions", path: "/solutions" },
              { name: "Catalogue" },
            ]}
          />
        </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#00A7A7] to-[#4DD0AE] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            {t('solutions.catalog.hero.title')}
          </h1>
          <p className="text-xl text-center max-w-3xl mx-auto opacity-95">
            {t('solutions.catalog.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-xl p-8 shadow-lg">
              <div className="flex items-start gap-3 mb-4">
                <Info className="h-6 w-6 text-[#00A7A7] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    {t('solutions.catalog.intro.text1')}
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-[#00A7A7] font-bold">•</span>
                      <span>{t('solutions.catalog.intro.scope1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#4DD0AE] font-bold">•</span>
                      <span>{t('solutions.catalog.intro.scope2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFB74D] font-bold">•</span>
                      <span>{t('solutions.catalog.intro.scope3')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scope 1 */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-[#00A7A7] rounded-full flex items-center justify-center">
                <Flame className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  {t('solutions.catalog.scope1.title')}
                </h2>
                <p className="text-muted-foreground">{t('solutions.catalog.scope1.subtitle')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope1.combustion.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope1.combustion.description')}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope1.cooling.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope1.cooling.description')}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope1.fleet.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope1.fleet.description')}
                </p>
              </div>
            </div>
            <div className="mt-6 bg-[#00A7A7]/10 border-l-4 border-[#00A7A7] rounded-r-lg p-4">
              <p className="text-sm font-semibold text-foreground">
                {t('solutions.catalog.scope1.reduction')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scope 2 */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-[#4DD0AE] rounded-full flex items-center justify-center">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  {t('solutions.catalog.scope2.title')}
                </h2>
                <p className="text-muted-foreground">{t('solutions.catalog.scope2.subtitle')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope2.optimization.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope2.optimization.description')}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope2.renewable.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope2.renewable.description')}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope2.monitoring.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope2.monitoring.description')}
                </p>
              </div>
            </div>
            <div className="mt-6 bg-[#4DD0AE]/10 border-l-4 border-[#4DD0AE] rounded-r-lg p-4">
              <p className="text-sm font-semibold text-foreground">
                {t('solutions.catalog.scope2.reduction')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scope 3 */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-[#FFB74D] rounded-full flex items-center justify-center">
                <Package className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  {t('solutions.catalog.scope3.title')}
                </h2>
                <p className="text-muted-foreground">{t('solutions.catalog.scope3.subtitle')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope3.purchasing.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope3.purchasing.description')}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope3.waste.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope3.waste.description')}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope3.transport.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope3.transport.description')}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold mb-3 text-card-foreground">
                  {t('solutions.catalog.scope3.awareness.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('solutions.catalog.scope3.awareness.description')}
                </p>
              </div>
            </div>
            <div className="mt-6 bg-[#FFB74D]/10 border-l-4 border-[#FFB74D] rounded-r-lg p-4">
              <p className="text-sm font-semibold text-foreground">
                {t('solutions.catalog.scope3.reduction')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#00A7A7] to-[#4DD0AE] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('solutions.catalog.cta.title')}</h2>
          <p className="text-xl mb-6 opacity-95">{t('solutions.catalog.cta.subtitle')}</p>
          <Button
            size="lg"
            onClick={() => navigate('/solutions/accompagnement')}
            className="bg-white text-[#00A7A7] hover:bg-gray-100 font-semibold text-lg"
          >
            {t('solutions.catalog.cta.button')}
          </Button>
        </div>
      </section>

      <SolutionRelatedLinks currentPath="/solutions/solutions" />
      </main>

      <NewFooter />
    </div>
  );
};

export default SolutionsCatalog;
