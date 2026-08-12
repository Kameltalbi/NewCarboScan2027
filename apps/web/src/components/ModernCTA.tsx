import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator, CheckCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const ModernCTA: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const startCalculator = () => {
    navigate('/calculateur-carbone');
  };

  const goToContact = () => {
    navigate('/contact');
  };

  return (
    <section className="py-16 px-4 bg-[#0B2E24]">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main CTA Card */}
        <div className="bg-[#0E3A2E]/60 p-8 rounded-2xl shadow-lg border border-[#1ABC9C]/20">
          <div className="mb-8">
            <div className="w-16 h-16 bg-[#1ABC9C]/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calculator className="w-8 h-8 text-[#1ABC9C]" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('newHomepage.finalCTA.title')}
            </h2>
            
            <p className="text-lg text-[#D1D5DB] mb-8 max-w-2xl mx-auto">
              {t('newHomepage.finalCTA.subtitle')}
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex items-center justify-center gap-2 p-3 bg-[#1ABC9C]/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-[#1ABC9C]" />
              <span className="text-[#1ABC9C] font-medium">{t('modernCTA.features.free')}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 p-3 bg-[#1ABC9C]/10 rounded-lg">
              <Zap className="w-5 h-5 text-[#1ABC9C]" />
              <span className="text-[#1ABC9C] font-medium">{t('modernCTA.features.fast')}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 p-3 bg-[#1ABC9C]/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-[#1ABC9C]" />
              <span className="text-[#1ABC9C] font-medium">{t('modernCTA.features.ai')}</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={goToContact}
              className="text-white px-8 py-3 text-lg font-semibold rounded-[10px] shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #1ABC9C 0%, #0F172A 100%)' }}
            >
              <Calculator className="w-5 h-5 mr-2" />
              {t('newHomepage.finalCTA.ctaPrimary')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={goToContact}
              className="border-2 border-white text-white bg-transparent hover:bg-white/10 px-8 py-3 text-lg font-semibold rounded-[10px] transition-all"
            >
              {t('newHomepage.finalCTA.ctaSecondary')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};