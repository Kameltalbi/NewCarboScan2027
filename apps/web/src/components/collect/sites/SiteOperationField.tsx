import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PERIMETER_EXAMPLES,
  suggestScopeForOperation,
  type OperationChoice,
} from "@/lib/perimeter/consolidation";

export function SiteOperationField({
  value,
  onChange,
}: {
  value: OperationChoice;
  onChange: (value: OperationChoice) => void;
}) {
  const suggestion = suggestScopeForOperation(value === "unspecified" ? null : value);
  return (
    <div className="space-y-2 md:col-span-2">
      <Label>Exploitation du site</Label>
      <Select value={value} onValueChange={(next) => onChange(next as OperationChoice)}>
        <SelectTrigger data-testid="site-operation-status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unspecified">Non renseigné</SelectItem>
          <SelectItem value="operated">Opéré</SelectItem>
          <SelectItem value="not_operated">Non opéré</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {PERIMETER_EXAMPLES}
        {suggestion === 3
          ? " Proposition affichée : Scope 3. Le scope enregistré reste celui de la donnée. Un site non opéré peut rester en Scope 1."
          : " Le scope enregistré reste celui de la donnée."}
      </p>
    </div>
  );
}
