import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const FormationSensibilisationContent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">

      <h1 className="text-3xl md:text-4xl font-bold text-center text-primary mb-6">
        {t("formationPages.carbonAwareness.title")}
      </h1>

      <p className="text-lg text-center mb-8">
        {t("formationPages.carbonAwareness.subtitle")}
      </p>

      <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
        {t("formationPages.carbonAwareness.whyTitle")}
      </h2>

      <p className="text-lg leading-relaxed mb-6 text-justify">
        {t("formationPages.carbonAwareness.whyDescription")}
      </p>

      <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
        {t("formationPages.carbonAwareness.formatTitle")}
      </h2>

      <ul className="text-gray-700 mb-8 space-y-2 ml-6">
        {(t("formationPages.carbonAwareness.formatItems", { returnObjects: true }) as string[]).map((item: string, index: number) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <div className="text-center mt-8">
        <Link to="/contact">
          <Button size="lg" className="bg-green-accent hover:bg-green-accent/90 text-white px-6 py-3 text-lg">
            {t("formationPages.carbonAwareness.ctaButton")}
          </Button>
        </Link>
      </div>

    </section>
  );
};