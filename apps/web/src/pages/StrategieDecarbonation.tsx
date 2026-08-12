import React from "react";
import { useTranslation } from "react-i18next";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, FileText, ChevronDown } from "lucide-react";

const STEP_ICONS = [Target, TrendingUp, FileText, ChevronDown];
const ADVANTAGE_ICONS = [FileText, Target, TrendingUp, ChevronDown];

const StrategieDecarbonation = () => {
  const { t } = useTranslation();

  const steps = t('strategieDecarbonation.steps', { returnObjects: true }) as { title: string; bullets: string[] }[];
  const advantages = t('strategieDecarbonation.advantages', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />

      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1F2C] to-[#6E59A5] py-16 md:py-24">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-gradient-to-r from-[#9b87f5]/20 to-[#D6BCFA]/20 blur-2xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-gradient-to-r from-[#FEC6A1]/20 to-[#F97316]/20 blur-3xl"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {t('strategieDecarbonation.hero.titleLead')}{' '}
                <span className="text-[#9b87f5]">{t('strategieDecarbonation.hero.titleAccent')}</span>
              </h1>
              <p className="text-xl text-gray-200 mb-8">{t('strategieDecarbonation.hero.subtitle')}</p>
              <Button size="lg" className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white px-8">
                {t('strategieDecarbonation.hero.cta')}
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-[#1A1F2C]">{t('strategieDecarbonation.stepsTitle')}</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => {
                const Icon = STEP_ICONS[i] ?? Target;
                return (
                  <div key={i} className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                    <div className="w-12 h-12 bg-[#9b87f5]/10 rounded-full flex items-center justify-center mb-4">
                      <Icon className="text-[#6E59A5] h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-[#1A1F2C]">{step.title}</h3>
                    <ul className="space-y-2 text-gray-600">
                      {step.bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-[#9b87f5] mr-2">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-[#1A1F2C]">{t('strategieDecarbonation.advantagesTitle')}</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {advantages.map((label, i) => {
                const Icon = ADVANTAGE_ICONS[i] ?? Target;
                return (
                  <div key={i} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                    <div className="w-16 h-16 bg-[#9b87f5]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="text-[#6E59A5] h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold mb-3 text-[#1A1F2C]">{label}</h3>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-br from-[#6E59A5] to-[#9b87f5]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('strategieDecarbonation.finalCta.title')}</h2>
              <p className="text-xl text-white/90 mb-8">{t('strategieDecarbonation.finalCta.subtitle')}</p>
              <Button size="lg" className="bg-white text-[#6E59A5] hover:bg-white/90 hover:text-[#9b87f5] px-8 text-lg">
                {t('strategieDecarbonation.finalCta.cta')}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <NewFooter />
    </div>
  );
};

export default StrategieDecarbonation;
