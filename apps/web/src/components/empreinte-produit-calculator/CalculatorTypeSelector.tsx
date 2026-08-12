import React from "react";
import { Building2, ArrowRight, Clock, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Props {
  onSelect: (type: "entreprise") => void;
}

const Option: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  duration: string;
  bullets: string[];
  onClick: () => void;
  badge?: string;
  startLabel: string;
}> = ({ icon, title, description, duration, bullets, onClick, badge, startLabel }) => (
  <button
    onClick={onClick}
    className="group text-left bg-card border border-border/60 hover:border-primary hover:shadow-lg rounded-2xl p-6 sm:p-8 transition-all duration-200 flex flex-col"
  >
    {badge && (
      <span className="self-start mb-4 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
        {badge}
      </span>
    )}
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground mb-5">{description}</p>

    <ul className="space-y-2 mb-6 flex-1">
      {bullets.map((b) => (
        <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
          {b}
        </li>
      ))}
    </ul>

    <div className="flex items-center justify-between pt-4 border-t border-border/40">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        {duration}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2 transition-all">
        {startLabel} <ArrowRight className="w-4 h-4" />
      </span>
    </div>
  </button>
);

export const CalculatorTypeSelector: React.FC<Props> = ({ onSelect }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const companyBullets = t("freeCalculators.selector.company.bullets", { returnObjects: true }) as string[];

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          {t("freeCalculators.selector.back")}
        </button>
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <BarChart3 className="w-3.5 h-3.5" />
            {t("freeCalculators.selector.badge")}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground mb-3">
            {t("freeCalculators.selector.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("freeCalculators.selector.subtitle")}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Option
            icon={<Building2 className="w-6 h-6" />}
            title={t("freeCalculators.selector.company.title")}
            description={t("freeCalculators.selector.company.description")}
            duration={t("freeCalculators.selector.company.duration")}
            badge={t("freeCalculators.selector.company.badge")}
            bullets={companyBullets}
            startLabel={t("freeCalculators.selector.start")}
            onClick={() => onSelect("entreprise")}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          {t("freeCalculators.selector.footer")}
        </p>
      </div>
    </div>
  );
};
