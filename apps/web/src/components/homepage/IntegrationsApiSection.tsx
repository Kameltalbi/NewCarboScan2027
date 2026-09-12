import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Share2, ArrowRight, FileCode, Webhook, Blocks } from "lucide-react";

const TAG_ICONS: Record<string, React.ElementType> = {
  openapi: FileCode,
  erp: Blocks,
  webhooks: Webhook,
};

export const IntegrationsApiSection: React.FC = () => {
  const { t } = useTranslation();

  const tags = ["openapi", "erp", "webhooks"] as const;

  return (
    <section className="py-20 bg-dashboard-bg">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-[1.5rem] p-8 md:p-12 shadow-soft border border-border/50 relative overflow-hidden">
            {/* Decorative number */}
            <span className="absolute top-4 right-6 md:top-6 md:right-10 text-6xl md:text-8xl font-bold text-primary/5 select-none">
              {t("homepage.integrationsApi.stepNumber")}
            </span>

            <div className="relative z-10">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Share2 className="w-7 h-7 text-primary" />
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-dashboard-text mb-4 max-w-md">
                {t("homepage.integrationsApi.title")}
              </h2>

              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-8">
                {t("homepage.integrationsApi.description")}
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                {tags.map((tag) => {
                  const Icon = TAG_ICONS[tag];
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-primary/5 text-primary font-medium text-sm"
                    >
                      <Icon className="w-4 h-4" />
                      {t(`homepage.integrationsApi.tags.${tag}`)}
                    </span>
                  );
                })}
              </div>

              <Link
                to="/contact?subject=api"
                className="inline-flex items-center gap-2 text-dashboard-text font-semibold hover:text-primary transition-colors group"
              >
                {t("homepage.integrationsApi.cta")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
