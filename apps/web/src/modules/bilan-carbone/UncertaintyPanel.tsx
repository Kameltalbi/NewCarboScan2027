import { summarizeUncertainty, type UncertaintyLine } from "@/lib/activity-data/uncertaintySummary";

export function UncertaintyPanel({ lines }: { lines: UncertaintyLine[] }) {
  const summary = summarizeUncertainty(lines);
  if (lines.length === 0) return null;

  return (
    <div className="space-y-2 pt-3 max-w-xl text-xs" data-testid="uncertainty-panel">
      <p className="font-medium text-slate-800">Incertitude</p>
      <p className="text-muted-foreground">
        Total : {summary.totalLabel}
        {summary.quality.real + summary.quality.estimated + summary.quality.default > 0 && (
          <>
            {" "}
            · {summary.quality.real} mesurée{summary.quality.real > 1 ? "s" : ""}, {summary.quality.estimated} estimée
            {summary.quality.estimated > 1 ? "s" : ""}, {summary.quality.default} par défaut
          </>
        )}
      </p>
      {summary.status === "empty" && (
        <p className="text-muted-foreground">Aucune incertitude saisie sur les lignes de ce bilan.</p>
      )}
      {summary.contributors.length > 0 && summary.status !== "empty" && (
        <ul className="text-muted-foreground space-y-1">
          {summary.contributors.map((line) => (
            <li key={line.label}>
              {line.label} · {line.uncertaintyPct} %
            </li>
          ))}
        </ul>
      )}
      {summary.hints.map((hint) => (
        <p key={hint} className="text-muted-foreground">
          {hint}
        </p>
      ))}
    </div>
  );
}
