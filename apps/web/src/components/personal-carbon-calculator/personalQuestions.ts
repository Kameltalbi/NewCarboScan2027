// Personal carbon footprint questionnaire — pure metadata.
// All labels/descriptions/options are resolved at render time via i18n.

export type FieldType = "number" | "select" | "text";

export interface PersonalFieldMeta {
  id: string;
  type: FieldType;
  required?: boolean;
  optionValues?: string[];
  // If provided, options use this key instead of the field id (e.g. clothing/electronics share "spend" scale)
  optionsKey?: string;
  conditional?: { dependsOn: string; showWhen: string[] };
}

export interface PersonalSectionMeta {
  key: string;
  fields: PersonalFieldMeta[];
}

export const PERSONAL_SECTIONS_META: PersonalSectionMeta[] = [
  {
    key: "profil",
    fields: [
      { id: "country", type: "select", required: true, optionValues: ["TN","FR","MA","DZ","EG","SN","CI","DE","BE","CH","ES","IT","UK","US","CA","autre"] },
      { id: "city", type: "text", required: true },
      { id: "householdSize", type: "number" },
    ],
  },
  {
    key: "logement",
    fields: [
      { id: "homeSurface", type: "number" },
      { id: "heatingType", type: "select", optionValues: ["gaz","fioul","electricite","pac","bois","aucun"] },
      { id: "heatingConsumption", type: "number" },
      { id: "electricityConsumption", type: "number" },
    ],
  },
  {
    key: "transport",
    fields: [
      { id: "carFuel", type: "select", optionValues: ["essence","diesel","hybride","electrique","aucun"] },
      { id: "carKm", type: "number" },
      { id: "trainKm", type: "number" },
      { id: "busKm", type: "number" },
      { id: "shortFlights", type: "number" },
      { id: "mediumFlights", type: "number" },
      { id: "longFlights", type: "number" },
    ],
  },
  {
    key: "alimentation",
    fields: [
      { id: "diet", type: "select", optionValues: ["omnivore","flexitarien","vegetarien","vegan"] },
      { id: "redMeatPerWeek", type: "number" },
    ],
  },
  {
    key: "consommation",
    fields: [
      { id: "clothingSpend", type: "select", optionValues: ["faible","moyen","eleve","tres_eleve"], optionsKey: "clothingSpend" },
      { id: "electronicsSpend", type: "select", optionValues: ["faible","moyen","eleve","tres_eleve"], optionsKey: "spend" },
      { id: "leisureSpend", type: "select", optionValues: ["faible","moyen","eleve","tres_eleve"], optionsKey: "spend" },
    ],
  },
  {
    key: "dechets",
    fields: [
      { id: "recycling", type: "select", optionValues: ["oui","non"] },
    ],
  },
];

// ─── Legacy exports kept for compatibility (personalCalculations.ts imports these types) ──
export interface PersonalField {
  id: string;
  label: string;
  description?: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  conditional?: { dependsOn: string; showWhen: string[] };
}

export interface PersonalSection {
  section: string;
  description?: string;
  fields: PersonalField[];
}

// Best-effort fallback (used only if any old consumer still imports it — the UI uses metadata).
export const personalSections: PersonalSection[] = PERSONAL_SECTIONS_META.map((s) => ({
  section: s.key,
  fields: s.fields.map((f) => ({
    id: f.id,
    label: f.id,
    type: f.type,
    required: f.required,
    conditional: f.conditional,
    options: f.optionValues?.map((v) => ({ value: v, label: v })),
  })),
}));
