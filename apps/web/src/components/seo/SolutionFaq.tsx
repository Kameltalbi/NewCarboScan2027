import React from "react";
import { buildFaqSchema } from "@/config/seo";
import { SEOHead } from "@/components/seo/SEOHead";

export type FaqItem = { question: string; answer: string };

type Props = {
  faqs: FaqItem[];
  path?: string;
  title?: string;
};

export const SolutionFaq: React.FC<Props> = ({
  faqs,
  path,
  title = "Questions fréquentes",
}) => {
  if (!faqs.length) return null;

  return (
    <>
      {path && <SEOHead path={path} jsonLd={buildFaqSchema(faqs)} />}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">{title}</h2>
          <dl className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-border bg-card p-5">
                <dt className="font-semibold text-foreground mb-2">{faq.question}</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
};
