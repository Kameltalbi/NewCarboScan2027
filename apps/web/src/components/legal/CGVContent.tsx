import React from "react";
import { useTranslation } from "react-i18next";

const CGVContent = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">{t("legal.terms.title")}</h1>
          
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.terms.sections.object.title")}</h2>
              <p>{t("legal.terms.sections.object.content")}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.terms.sections.services.title")}</h2>
              <p>{t("legal.terms.sections.services.content")}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.terms.sections.pricing.title")}</h2>
              <p>{t("legal.terms.sections.pricing.content")}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.terms.sections.payment.title")}</h2>
              <p>{t("legal.terms.sections.payment.content")}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.terms.sections.responsibility.title")}</h2>
              <p>{t("legal.terms.sections.responsibility.content")}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.terms.sections.applicableLaw.title")}</h2>
              <p>{t("legal.terms.sections.applicableLaw.content")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CGVContent;