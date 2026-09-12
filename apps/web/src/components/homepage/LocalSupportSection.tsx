import React from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, ClipboardCheck, Users, ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const SUPPORT_CARDS = [
  {
    key: "training",
    icon: GraduationCap,
    iconColor: "text-[#0E7C66]",
    bgColor: "bg-[#E8F5E9]",
  },
  {
    key: "audit",
    icon: ClipboardCheck,
    iconColor: "text-[#E8A33D]",
    bgColor: "bg-[#FFF4E5]",
  },
  {
    key: "consulting",
    icon: Users,
    iconColor: "text-[#0E7C66]",
    bgColor: "bg-[#E8F5E9]",
  },
] as const;

export const LocalSupportSection: React.FC = () => {
  const { t } = useTranslation();

  const cards = t("homepage.localSupport.cards", { returnObjects: true }) as {
    training: { title: string; description: string };
    audit: { title: string; description: string };
    consulting: { title: string; description: string };
  };

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#E8F5E9] text-[#0E7C66] text-sm font-medium px-4 py-1.5 rounded-[4px] mb-5">
            <MapPin className="w-4 h-4" />
            {t("homepage.localSupport.badge")}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            {t("homepage.localSupport.titleLine1")}
            <br />
            {t("homepage.localSupport.titleLine2")}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t("homepage.localSupport.subtitle")}
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {SUPPORT_CARDS.map((card) => {
            const Icon = card.icon;
            const content = cards[card.key];
            return (
              <div
                key={card.key}
                className="group rounded-3xl p-8 border border-border/50 hover:shadow-lg transition-shadow bg-white"
              >
                <div
                  className={`w-14 h-14 ${card.bgColor} rounded-2xl flex items-center justify-center mb-6`}
                >
                  <Icon className={`w-7 h-7 ${card.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {content.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {content.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom highlight */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0B1F18] to-[#1B3A2D] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              {t("homepage.localSupport.ctaTitle")}
            </h3>
            <p className="text-white/70">
              {t("homepage.localSupport.ctaDescription")}
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-white text-[#1B3A2D] font-semibold px-6 py-3 rounded-[4px] hover:bg-[#E8F5E9] transition-colors shrink-0"
          >
            {t("homepage.localSupport.ctaLabel")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
