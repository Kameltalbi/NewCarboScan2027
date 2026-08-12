import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Users, Scale } from "lucide-react";

export const AutresServicesContent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-20 px-4 md:px-10 bg-background">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-foreground">
          {t("otherServices.hero.title")}
        </h1>
        <p className="text-xl text-center text-muted-foreground mb-16 max-w-3xl mx-auto">
          {t("otherServices.hero.subtitle")}
        </p>

        {/* Service 1: Reporting durable */}
        <div className="mb-16 bg-card rounded-lg p-8 shadow-sm border border-border">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                {t("otherServices.reporting.title")}
              </h2>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            {t("otherServices.reporting.intro")}
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-4">
            {t("otherServices.reporting.accompanyTitle")}
          </h3>

          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.reporting.point1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.reporting.point2")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.reporting.point3")}</span>
            </li>
          </ul>

          <div className="bg-accent/50 p-4 rounded-lg">
            <p className="text-foreground">
              👉 {t("otherServices.reporting.cta")}{" "}
              <Link to="/contact" className="text-primary hover:underline font-semibold">
                {t("otherServices.contactUs")}
              </Link>{" "}
              {t("otherServices.reporting.ctaEnd")}
            </p>
          </div>
        </div>

        {/* Service 2: Sensibilisation et formation */}
        <div className="mb-16 bg-card rounded-lg p-8 shadow-sm border border-border">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                {t("otherServices.training.title")}
              </h2>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            {t("otherServices.training.intro")}
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-4">
            {t("otherServices.training.weOrganize")}
          </h3>

          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.training.point1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.training.point2")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.training.point3")}</span>
            </li>
          </ul>

          <div className="bg-accent/50 p-4 rounded-lg">
            <p className="text-foreground">
              👉 {t("otherServices.training.cta")}{" "}
              <Link to="/contact" className="text-primary hover:underline font-semibold">
                {t("otherServices.contactUs")}
              </Link>{" "}
              {t("otherServices.training.ctaEnd")}
            </p>
          </div>
        </div>

        {/* Service 3: Présentation et analyse des réglementations */}
        <div className="mb-16 bg-card rounded-lg p-8 shadow-sm border border-border">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                {t("otherServices.regulations.title")}
              </h2>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            {t("otherServices.regulations.intro")}
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-4">
            {t("otherServices.regulations.withOurSupport")}
          </h3>

          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.regulations.point1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.regulations.point2")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold mt-1">•</span>
              <span className="text-muted-foreground">{t("otherServices.regulations.point3")}</span>
            </li>
          </ul>

          <div className="bg-accent/50 p-4 rounded-lg">
            <p className="text-foreground">
              👉 {t("otherServices.regulations.cta")}{" "}
              <Link to="/contact" className="text-primary hover:underline font-semibold">
                {t("otherServices.contactUs")}
              </Link>{" "}
              {t("otherServices.regulations.ctaEnd")}
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center bg-primary/5 rounded-lg p-8 border border-primary/20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t("otherServices.finalCTA.title")}
          </h2>
          <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
            {t("otherServices.finalCTA.description")}
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
              {t("otherServices.finalCTA.button")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
