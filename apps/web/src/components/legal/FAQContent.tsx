import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

const FAQContent = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center">{t("faq.title")}</h1>
          
          <Accordion type="single" collapsible defaultValue="item-offering" className="mb-12">
            <AccordionItem value="item-offering">
              <AccordionTrigger className="text-lg font-medium">
                {t("faq.questions.offering.question")}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                <p className="mb-3">{t("faq.questions.offering.intro")}</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  {(t("faq.questions.offering.items", { returnObjects: true }) as string[]).map((item, idx) => {
                    const parts = item.split(/\*\*(.+?)\*\*/);
                    return (
                      <li key={idx}>
                        {parts.map((p, i) =>
                          i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p>{t("faq.questions.offering.outro")}</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-medium">
                {t("faq.questions.carbonFootprint.question")}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                {t("faq.questions.carbonFootprint.answer")}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-medium">
                {t("faq.questions.howToUse.question")}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                {t("faq.questions.howToUse.answer")}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-medium">
                {t("faq.questions.pricing.question")}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                {t("faq.questions.pricing.answer")}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-medium">
                {t("faq.questions.security.question")}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                <p className="mb-3">
                  {t("faq.questions.security.answer1")}
                </p>
                <p>
                  {t("faq.questions.security.answer2")}
                </p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-lg font-medium">
                {t("faq.questions.sectors.question")}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                <p>{t("faq.questions.sectors.answer")}</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  {(t("faq.questions.sectors.sectors", { returnObjects: true }) as string[]).map((sector: string, index: number) => (
                    <li key={index}>{sector}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
            <h3 className="text-xl font-semibold mb-3">{t("faq.moreQuestions.title")}</h3>
            <p className="text-gray-600 mb-4">
              {t("faq.moreQuestions.subtitle")}
            </p>
            <div className="flex justify-center items-center mb-4">
              <Mail className="h-5 w-5 mr-2 text-primary" />
              <a href="mailto:contact@carboscan.io" className="text-primary hover:underline">
                contact@carboscan.io
              </a>
            </div>
            <div className="flex justify-center">
              <Link to="/contact">
                <Button variant="outline" className="flex items-center">
                  <span className="mr-2">{t("faq.moreQuestions.contactPage")}</span> 
                  👉
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQContent;