import React from "react";
import { useTranslation } from "react-i18next";

const LegalMentionsContent = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">{t("legal.mentions.title")}</h1>
          
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.mentions.publisher.title")}</h2>
              <p>{t("legal.mentions.publisher.company")}</p>
              <p>{t("legal.mentions.publisher.description")}</p>
              <p>{t("legal.mentions.publisher.location")}</p>
              <p>{t("legal.mentions.publisher.email")} <a href="mailto:contact@carboscan.io" className="text-blue-600 hover:underline">contact@carboscan.io</a></p>
              <p>{t("legal.mentions.publisher.vat")}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.mentions.director.title")}</h2>
              <p>{t("legal.mentions.director.name")}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">{t("legal.mentions.hosting.title")}</h2>
              <p>{t("legal.mentions.hosting.description1")}</p>
              <p>{t("legal.mentions.hosting.description2")}</p>
              <p>{t("legal.mentions.hosting.description3")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LegalMentionsContent;