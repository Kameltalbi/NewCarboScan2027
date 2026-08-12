import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import FAQContent from "@/components/legal/FAQContent";
import { SEOHead } from "@/components/seo/SEOHead";
import { buildFaqSchema } from "@/config/seo";
import { useTranslation } from "react-i18next";

const FAQ = () => {
  const { t } = useTranslation();

  const faqs = [
    {
      question: t("faq.questions.offering.question"),
      answer: [
        t("faq.questions.offering.intro"),
        ...(t("faq.questions.offering.items", { returnObjects: true }) as string[]).map((s) =>
          s.replace(/\*\*/g, "")
        ),
        t("faq.questions.offering.outro"),
      ].join(" "),
    },
    {
      question: t("faq.questions.carbonFootprint.question"),
      answer: t("faq.questions.carbonFootprint.answer"),
    },
    {
      question: t("faq.questions.howToUse.question"),
      answer: t("faq.questions.howToUse.answer"),
    },
    {
      question: t("faq.questions.pricing.question"),
      answer: t("faq.questions.pricing.answer"),
    },
    {
      question: t("faq.questions.security.question"),
      answer: `${t("faq.questions.security.answer1")} ${t("faq.questions.security.answer2")}`,
    },
    {
      question: t("faq.questions.sectors.question"),
      answer: [
        t("faq.questions.sectors.answer"),
        ...(t("faq.questions.sectors.sectors", { returnObjects: true }) as string[]),
      ].join(" "),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead path="/faq" jsonLd={buildFaqSchema(faqs)} />
      <MainHeader />

      <main id="main-content" className="flex-grow">
        <FAQContent />
      </main>

      <NewFooter />
    </div>
  );
};

export default FAQ;
