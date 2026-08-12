import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Sparkles,
  ArrowRight,
  CloudUpload,
  FileSpreadsheet,
  Database,
  ShieldCheck,
  Zap,
  BarChart3,
  CheckCircle2,
  Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const CarboScanCollectSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    {
      icon: Zap,
      title: t("newHomepage.collect.features.automated.title"),
      description: t("newHomepage.collect.features.automated.description")
    },
    {
      icon: FileSpreadsheet,
      title: t("newHomepage.collect.features.noExcel.title"),
      description: t("newHomepage.collect.features.noExcel.description")
    },
    {
      icon: Database,
      title: t("newHomepage.collect.features.centralized.title"),
      description: t("newHomepage.collect.features.centralized.description")
    },
    {
      icon: ShieldCheck,
      title: t("newHomepage.collect.features.trusted.title"),
      description: t("newHomepage.collect.features.trusted.description")
    }
  ];

  const handleRequestDemo = () => {
    navigate('/contact');
  };

  return (
    <section 
      id="carboscan-collect" 
      className="py-20 lg:py-28 bg-white relative overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 bg-[#12B8A5]/10 text-[#12B8A5] px-4 py-2 rounded-full text-xs font-semibold mb-6 border border-[#12B8A5]/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("newHomepage.collect.badge")}</span>
          </div>
          
          <h2 
            className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 leading-tight"
            style={{ color: '#0A1A2F' }}
          >
            {t("newHomepage.collect.title")}
          </h2>
          
          <p 
            className="text-xl lg:text-2xl font-semibold text-gray-800 mb-6 max-w-4xl mx-auto"
          >
            {t("newHomepage.collect.tagline")}
          </p>
          
          <p 
            className="text-lg lg:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed"
          >
            {t("newHomepage.collect.description")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-6 lg:p-8 hover:border-[#12B8A5]/50 hover:shadow-lg transition-all duration-300 group"
              >
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                  style={{ 
                    backgroundColor: '#12B8A5',
                    color: 'white'
                  }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                
                <h3 
                  className="text-xl font-bold mb-3 leading-tight"
                  style={{ color: '#0A1A2F' }}
                >
                  {feature.title}
                </h3>
                
                <p 
                  className="text-base text-gray-600 leading-relaxed"
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <Button 
            onClick={handleRequestDemo}
            size="lg"
            className="bg-[#12B8A5] hover:bg-[#0E9E8B] text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {t("newHomepage.collect.cta")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

