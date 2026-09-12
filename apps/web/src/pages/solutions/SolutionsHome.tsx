import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Target, Zap, TrendingDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHeader } from "@/components/HomeHeader";
import { NewFooter } from "@/components/NewFooter";
import { MarketingBreadcrumbs } from "@/components/seo/MarketingBreadcrumbs";
import { SolutionFaq } from "@/components/seo/SolutionFaq";
import { SolutionRelatedLinks } from "@/components/seo/SolutionRelatedLinks";
import { SOLUTION_HUB_FAQS } from "@/config/solutionPages";

const SolutionsHome: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-w-full bg-background">
      <HomeHeader />

      <main id="main-content">
        <section className="relative bg-gradient-to-br from-[#00A7A7] to-[#4DD0AE] text-white py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <MarketingBreadcrumbs
                className="mb-8 text-white"
                items={[
                  { name: "Accueil", path: "/" },
                  { name: "Solutions" },
                ]}
              />
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  {t("solutions.home.hero.title")}
                </h1>
                <p className="text-xl md:text-2xl mb-8 leading-relaxed opacity-95">
                  {t("solutions.home.hero.subtitle")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => navigate("/solutions/solutions")}
                    className="bg-white text-[#00A7A7] hover:bg-gray-100 font-semibold text-lg"
                  >
                    {t("solutions.home.hero.discoverButton")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => navigate("/contact")}
                    className="bg-[#00A7A7] text-white hover:bg-[#00A7A7]/90 border-2 border-white font-semibold text-lg"
                  >
                    {t("solutions.home.hero.contactButton")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <blockquote className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                "{t("solutions.home.mission.quote")}"
              </blockquote>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("solutions.home.mission.description")}
              </p>
            </div>
          </div>
        </section>

        <SolutionRelatedLinks />

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              {t("solutions.home.axes.title")}
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-[#00A7A7]/10 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-7 w-7 text-[#00A7A7]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-card-foreground">
                  {t("solutions.home.axes.energy.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("solutions.home.axes.energy.description")}
                </p>
              </div>

              <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-[#4DD0AE]/10 rounded-full flex items-center justify-center mb-4">
                  <Target className="h-7 w-7 text-[#4DD0AE]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-card-foreground">
                  {t("solutions.home.axes.mobility.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("solutions.home.axes.mobility.description")}
                </p>
              </div>

              <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-[#FFB74D]/10 rounded-full flex items-center justify-center mb-4">
                  <TrendingDown className="h-7 w-7 text-[#FFB74D]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-card-foreground">
                  {t("solutions.home.axes.production.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("solutions.home.axes.production.description")}
                </p>
              </div>

              <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-[#00A7A7]/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-7 w-7 text-[#00A7A7]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-card-foreground">
                  {t("solutions.home.axes.culture.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("solutions.home.axes.culture.description")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-[#00A7A7]/10 to-[#4DD0AE]/10 rounded-2xl p-8 md:p-12 border-2 border-[#00A7A7]/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#00A7A7] rounded-full flex items-center justify-center">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    {t("solutions.home.iot.title")}
                  </h2>
                </div>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {t("solutions.home.iot.description")}
                </p>
                <Button
                  onClick={() => navigate("/wattbim")}
                  className="bg-[#00A7A7] text-white hover:bg-[#00A7A7]/90 font-semibold"
                >
                  Découvrir WattBim
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                {t("solutions.home.whyUs.title")}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00A7A7] flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <p className="text-muted-foreground">
                      {t(`solutions.home.whyUs.point${index}`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SolutionFaq faqs={SOLUTION_HUB_FAQS} path="/solutions" />

        <section className="py-16 bg-gradient-to-r from-[#00A7A7] to-[#4DD0AE] text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("solutions.home.cta.title")}
            </h2>
            <Button
              size="lg"
              onClick={() => navigate("/solutions/solutions")}
              className="bg-white text-[#00A7A7] hover:bg-gray-100 font-semibold text-lg"
            >
              {t("solutions.home.cta.button")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </main>

      <NewFooter />
    </div>
  );
};

export default SolutionsHome;
