import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { TrendingDown, TrendingUp, Target, Sparkles, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PersonalEmissionsResult } from "./types";
import { getPersonalRecommendations } from "./personalRecommendations";
import { generatePersonalPdf } from "./generatePersonalPdf";

interface Props {
  results: PersonalEmissionsResult;
  firstName?: string;
}

export const PersonalResultsScreen: React.FC<Props> = ({ results, firstName }) => {
  const { t } = useTranslation();
  const base = "freeCalculators.personal.results";
  const recos = getPersonalRecommendations(results);
  const target = 2;
  const progressVsTarget = Math.min(100, (target / Math.max(results.total, 0.01)) * 100);
  const isAbove = results.vsNationalAverage > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground uppercase tracking-wider">{t(`${base}.eyebrow`)}</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
          {firstName ? t(`${base}.titleWithName`, { name: firstName }) : t(`${base}.titleNoName`)}
        </h1>
      </div>

      <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="text-6xl md:text-7xl font-bold text-primary mb-2">
          {results.total.toFixed(2)}
        </div>
        <div className="text-lg text-muted-foreground mb-6">{t(`${base}.unit`)}</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="rounded-lg bg-background/60 p-4">
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mb-1">
              {isAbove ? <TrendingUp className="w-4 h-4 text-destructive" /> : <TrendingDown className="w-4 h-4 text-primary" />}
              {t(`${base}.vsAverage`)}
            </div>
            <div className={`text-xl font-semibold ${isAbove ? "text-destructive" : "text-primary"}`}>
              {isAbove ? "+" : ""}{results.vsNationalAverage}%
            </div>
          </div>
          <div className="rounded-lg bg-background/60 p-4">
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              {t(`${base}.target2050`)}
            </div>
            <div className="text-xl font-semibold text-foreground">2.0 tCO₂e</div>
          </div>
          <div className="rounded-lg bg-background/60 p-4">
            <div className="text-sm text-muted-foreground mb-1">{t(`${base}.gap`)}</div>
            <div className="text-xl font-semibold text-foreground">{results.gapVs2050.toFixed(2)} t</div>
          </div>
        </div>

        <div className="mt-6 max-w-md mx-auto">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{t(`${base}.parisGoal`)}</span>
            <span>{progressVsTarget.toFixed(0)}%</span>
          </div>
          <Progress value={progressVsTarget} className="h-2" />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">{t(`${base}.breakdownTitle`)}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t(`${base}.breakdownSubtitle`)}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={results.breakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}
                >
                  {results.breakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} tCO₂e`} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {results.breakdown.map((cat) => {
              const pct = results.total > 0 ? (cat.value / results.total) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {cat.value.toFixed(2)} t · <strong>{pct.toFixed(0)}%</strong>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{t(`${base}.actionsTitle`)}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {t(`${base}.actionsSubtitle`)}<strong>{results.majorCategory}</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recos.map((r, i) => (
            <div key={i} className="rounded-lg border border-border/60 p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-medium text-foreground">{r.title}</h3>
                <span className="text-xs font-semibold text-primary whitespace-nowrap shrink-0">
                  {r.impact}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {r.category}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-center pt-2">
        <Button
          onClick={() => generatePersonalPdf(results, firstName)}
          variant="outline"
          className="rounded-full px-6 h-11 gap-2 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Download className="w-4 h-4" />
          {t(`${base}.downloadPdf`)}
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground pt-2 pb-8">
        {t(`${base}.methodology`)}
      </div>
    </div>
  );
};
