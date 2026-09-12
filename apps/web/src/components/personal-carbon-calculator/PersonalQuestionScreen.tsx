import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Leaf, AlertTriangle } from "lucide-react";
import { PersonalSectionMeta } from "./personalQuestions";
import { PersonalSurveyData } from "./types";

interface Props {
  section: PersonalSectionMeta;
  data: PersonalSurveyData;
  onUpdate: (id: string, value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstSection: boolean;
  isLastSection: boolean;
  currentIndex: number;
  totalSections: number;
}

export const PersonalQuestionScreen: React.FC<Props> = ({
  section, data, onUpdate, onNext, onPrevious, isFirstSection, isLastSection, currentIndex, totalSections,
}) => {
  const { t } = useTranslation();
  const base = "freeCalculators.personal";

  const visibleFields = section.fields.filter((f) => {
    if (!f.conditional) return true;
    const dep = (data as any)[f.conditional.dependsOn];
    return f.conditional.showWhen.includes(String(dep));
  });

  const missingRequired = visibleFields
    .filter((f) => f.required)
    .filter((f) => {
      const v = (data as any)[f.id];
      return v === null || v === undefined || String(v).trim() === "";
    });
  const canProceed = missingRequired.length === 0;

  const getFieldLabel = (fieldId: string) => t(`${base}.fields.${fieldId}.label`, fieldId);
  const getFieldDescription = (fieldId: string) => t(`${base}.fields.${fieldId}.description`, "");
  const getFieldPlaceholder = (fieldId: string) => t(`${base}.fields.${fieldId}.placeholder`, "");

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-8 pt-6 pb-2 flex items-center gap-3">
        <div className="flex gap-1.5 flex-1">
          {Array.from({ length: totalSections }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                idx <= currentIndex ? "bg-primary" : "bg-border/40"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium shrink-0">
          {currentIndex + 1}/{totalSections}
        </span>
        <span className="text-xs text-muted-foreground/60">{t(`${base}.progressLabel`)}</span>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-8 pt-6 pb-28">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
          {t(`${base}.sections.${section.key}.title`)}
        </h2>
        <p className="text-muted-foreground text-sm mb-8 max-w-2xl">
          {t(`${base}.sections.${section.key}.description`, "")}
        </p>

        <div className="space-y-6 max-w-2xl">
          {visibleFields.map((f) => {
            const value = (data as any)[f.id];
            let label = getFieldLabel(f.id);
            let description = getFieldDescription(f.id);
            let placeholder = getFieldPlaceholder(f.id);

            // Dynamic label/description for heating consumption depending on heating type
            if (f.id === "heatingConsumption") {
              const ht = data.heatingType;
              if (ht === "bois") {
                label = t(`${base}.fields.heatingConsumption.bois.label`);
                description = t(`${base}.fields.heatingConsumption.bois.description`);
                placeholder = t(`${base}.fields.heatingConsumption.bois.placeholder`);
              } else if (ht === "fioul") {
                label = t(`${base}.fields.heatingConsumption.fioul.label`);
                description = t(`${base}.fields.heatingConsumption.fioul.description`);
                placeholder = t(`${base}.fields.heatingConsumption.fioul.placeholder`);
              } else if (ht === "aucun" || ht === "") {
                return null;
              } else {
                label = t(`${base}.fields.heatingConsumption.kwh.label`);
                description = t(`${base}.fields.heatingConsumption.kwh.description`);
                placeholder = t(`${base}.fields.heatingConsumption.kwh.placeholder`);
              }
            }

            const optionsKey = f.optionsKey || f.id;

            return (
              <div key={f.id}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                {description && <p className="text-xs text-muted-foreground mb-2">{description}</p>}
                {f.type === "select" ? (
                  <Select onValueChange={(v) => onUpdate(f.id, v)} value={value || ""}>
                    <SelectTrigger className="w-full h-11 border-border/60">
                      <SelectValue placeholder={t(`${base}.selectPlaceholder`)} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {f.optionValues?.map((v) => (
                        <SelectItem key={v} value={v}>
                          {t(`${base}.options.${optionsKey}.${v}`, v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === "text" ? (
                  <Input
                    type="text"
                    value={value ?? ""}
                    onChange={(e) => onUpdate(f.id, e.target.value)}
                    placeholder={placeholder || t(`${base}.inputPlaceholder`)}
                    className="h-11 border-border/60"
                  />
                ) : (
                  <Input
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onUpdate(f.id, e.target.value === "" ? null : Number(e.target.value))}
                    placeholder={placeholder || t(`${base}.inputPlaceholder`)}
                    className="h-11 border-border/60"
                  />
                )}
                {(() => {
                  const v = typeof value === "number" ? value : NaN;
                  if (isNaN(v) || v <= 0) return null;
                  const ht = data.heatingType;
                  let warn: string | null = null;
                  if (f.id === "heatingConsumption") {
                    if (ht === "bois" && v > 15) warn = t(`${base}.warnings.boisHigh`, { v });
                    else if (ht === "fioul" && v > 4000) warn = t(`${base}.warnings.fioulHigh`, { v: v.toLocaleString() });
                    else if ((ht === "gaz" || ht === "electricite" || ht === "pac") && v > 25000)
                      warn = t(`${base}.warnings.kwhHigh`, { v: v.toLocaleString() });
                  } else if (f.id === "electricityConsumption" && v > 10000) {
                    warn = t(`${base}.warnings.elecHigh`, { v: v.toLocaleString() });
                  } else if (f.id === "carKm" && v > 50000) {
                    warn = t(`${base}.warnings.carHigh`, { v: v.toLocaleString() });
                  } else if (f.id === "longFlights" && v > 5) {
                    warn = t(`${base}.warnings.longFlightsHigh`, { v });
                  } else if (f.id === "mediumFlights" && v > 10) {
                    warn = t(`${base}.warnings.mediumFlightsHigh`, { v });
                  } else if (f.id === "shortFlights" && v > 15) {
                    warn = t(`${base}.warnings.shortFlightsHigh`, { v });
                  } else if (f.id === "redMeatPerWeek" && v > 14) {
                    warn = t(`${base}.warnings.redMeatHigh`);
                  } else if (f.id === "householdSize" && v > 12) {
                    warn = t(`${base}.warnings.householdHigh`, { v });
                  } else if (f.id === "homeSurface" && v > 500) {
                    warn = t(`${base}.warnings.homeSurfaceHigh`, { v });
                  }
                  if (!warn) return null;
                  return (
                    <div className="mt-2 flex gap-2 items-start rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">{warn}</p>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        <div className="max-w-2xl mt-8 flex gap-3 items-start rounded-xl bg-primary/5 border border-primary/10 px-5 py-4">
          <Leaf className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t(`${base}.confidentialTip`)}
          </p>
        </div>
      </div>

      <div className="border-t border-border/40 bg-background px-4 sm:px-8 py-4 flex flex-col items-center gap-2">
        {!canProceed && (
          <p className="text-xs text-destructive">
            {t(`${base}.requiredHint`)}
          </p>
        )}
        <div className="flex justify-center gap-3 sm:gap-4">
          <Button variant="outline" onClick={onPrevious} disabled={isFirstSection} className="px-8 h-11 rounded-[4px] border-border/60">
            {t(`${base}.buttons.back`)}
          </Button>
          <Button onClick={onNext} disabled={!canProceed} className="px-8 h-11 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLastSection ? t(`${base}.buttons.finalize`) : t(`${base}.buttons.next`)}
            {!isLastSection && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
