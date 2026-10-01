import { Alert, AlertDescription } from "@/components/ui/alert";
import { MethodNoteLink } from "@/components/method/MethodNoteLink";
import {
  PHYSICAL_PREFERENCE,
  UNVALIDATED_MONETARY_LABEL,
  dataMethodLabel,
  shareByMethod,
  type DataMethod,
} from "@/lib/activity-data/dataMethod";

const ORDER: Array<DataMethod | "unspecified"> = [
  "physical",
  "monetary",
  "direct_emission",
  "supplier_specific",
  "other",
  "unspecified",
];

export function DataMethodShare({
  lines,
}: {
  lines: Array<{ method?: string | null; kg: number; source?: string | null }>;
}) {
  const share = shareByMethod(lines);
  if (share.totalKg <= 0) return null;
  const unvalidated = lines.some((line) => line.source === UNVALIDATED_MONETARY_LABEL);
  const showMonetaryNote = share.kg.monetary > 0 || unvalidated;

  return (
    <div className="space-y-2 pt-3 max-w-xl" data-testid="data-method-share">
      <p className="text-xs text-muted-foreground">
        {PHYSICAL_PREFERENCE}{" "}
        <MethodNoteLink noteId="ratios" label="Note de méthode : ratios" />
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {ORDER.filter((key) => share.kg[key] > 0).map((key) => (
          <span key={key}>
            <span className="font-medium text-slate-800">{share.percent[key]} %</span>{" "}
            {key === "unspecified" ? "non renseigné" : dataMethodLabel(key).toLowerCase()}
          </span>
        ))}
      </div>
      {showMonetaryNote && (
        <Alert>
          <AlertDescription>
            Un ratio monétaire, en euros ou en dinars tunisiens, n'est pas validé ABC. La donnée physique reste préférable. Les nombres de ces ratios ne sont pas modifiés ici.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
