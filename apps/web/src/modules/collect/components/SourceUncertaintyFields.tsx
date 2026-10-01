import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCE_TYPES } from "@/lib/activity-data/uncertaintySummary";
import { MethodNoteLink } from "@/components/method/MethodNoteLink";

export function SourceUncertaintyFields({
  sourceType,
  uncertainty,
  onSourceType,
  onUncertainty,
  idPrefix = "line",
}: {
  sourceType: string;
  uncertainty: string;
  onSourceType: (value: string) => void;
  onUncertainty: (value: string) => void;
  idPrefix?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-source-type`}>Type de source</Label>
        <Select value={sourceType || "unspecified"} onValueChange={onSourceType}>
          <SelectTrigger id={`${idPrefix}-source-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unspecified">Non renseigné</SelectItem>
            {SOURCE_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-uncertainty`}>Incertitude (%)</Label>
        <Input
          id={`${idPrefix}-uncertainty`}
          inputMode="decimal"
          value={uncertainty}
          onChange={(event) => onUncertainty(event.target.value)}
          placeholder="Optionnel, 0 à 100"
        />
      </div>
      <div className="sm:col-span-2">
        <MethodNoteLink noteId="incertitude" label="Note de méthode : incertitude et qualité" />
      </div>
    </div>
  );
}
