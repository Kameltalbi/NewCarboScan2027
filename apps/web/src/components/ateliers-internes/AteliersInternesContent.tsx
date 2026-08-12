import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const AteliersInternesContent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">

      <h1 className="text-3xl md:text-4xl font-bold text-center text-primary mb-6">
        {t("formationPages.internalWorkshops.title")}
      </h1>

      <p className="text-lg text-center mb-8">
        {t("formationPages.internalWorkshops.subtitle")}
      </p>

      <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
        {t("formationPages.internalWorkshops.themesTitle")}
      </h2>

      <ul className="text-gray-700 mb-8 space-y-2 ml-6">
        {(t("formationPages.internalWorkshops.themesItems", { returnObjects: true }) as string[]).map((item: string, index: number) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <p className="text-lg leading-relaxed mb-8 text-justify">
        {t("formationPages.internalWorkshops.description")}
      </p>

      <div className="text-center mt-8">
        <Link to="/contact">
          <Button size="lg" className="bg-green-accent hover:bg-green-accent/90 text-white px-6 py-3 text-lg">
            {t("formationPages.internalWorkshops.ctaButton")}
          </Button>
        </Link>
      </div>

    </section>
  );
};