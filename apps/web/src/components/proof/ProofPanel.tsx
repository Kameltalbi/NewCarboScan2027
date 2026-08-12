import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export type SixQuestions = {
  quelleDonnee: Record<string, unknown>;
  quelleSource: Record<string, unknown>;
  quelFacteur: Record<string, unknown>;
  quelleFormule: Record<string, unknown>;
  quelleVersion: Record<string, unknown>;
  quiAValide: Record<string, unknown>;
};

type Props = {
  proofId?: string;
  lineKey?: string;
  resultLabel?: string;
  sixQuestions: SixQuestions;
};

const SECTIONS: Array<{ key: keyof SixQuestions; title: string }> = [
  { key: "quelleDonnee", title: "Quelle donnée ?" },
  { key: "quelleSource", title: "Quelle source ?" },
  { key: "quelFacteur", title: "Quel facteur ?" },
  { key: "quelleFormule", title: "Quelle formule ?" },
  { key: "quelleVersion", title: "Quelle version ?" },
  { key: "quiAValide", title: "Qui l’a validé ?" },
];

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export const ProofPanel: React.FC<Props> = ({
  proofId,
  lineKey,
  resultLabel,
  sixQuestions,
}) => {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">Preuve du chiffre</CardTitle>
          {resultLabel && <Badge variant="secondary">{resultLabel}</Badge>}
          {proofId && (
            <Badge variant="outline" className="font-mono text-xs">
              {proofId}
            </Badge>
          )}
          {lineKey && (
            <span className="text-xs text-muted-foreground">ligne {lineKey}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Chaque chiffre réglementaire doit répondre à ces six questions.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {SECTIONS.map((section, idx) => {
          const data = sixQuestions[section.key] ?? {};
          const entries = Object.entries(data);
          return (
            <div key={section.key}>
              {idx > 0 && <Separator className="mb-4" />}
              <h3 className="text-sm font-semibold mb-2">{section.title}</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {entries.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-border/40 py-1">
                    <dt className="text-muted-foreground shrink-0">{k}</dt>
                    <dd className="text-right font-medium break-all">{formatValue(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ProofPanel;
