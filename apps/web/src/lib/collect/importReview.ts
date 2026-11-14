import { ademeFactorNote, type AdemeFactorRef } from "@/lib/factors/ademeFactor";
import { findChoice } from "@/modules/collect/activityGroups";
import { isTunisiaCountry } from "@/lib/factors/factorSelection";
import { tunisiaGridFactor } from "@/lib/factors/ademeFactor";
import {
  previewLine,
  proposeTunisiaElectricity,
  type LinePreview,
  type PreviewFactor,
} from "@/lib/collect/linePreview";

export type ImportStatus = "ready" | "confirm" | "incomplete";
export type ProductState = "cru" | "cuit" | null;

export interface ImportSheet {
  name: string;
  rows: unknown[][];
}

export interface ImportLine {
  id: string;
  sourceRow: number;
  designation: string;
  quantity: number | null;
  unit: string;
  productQuery: string;
  productLabel: string;
  choiceValue: string | null;
  state: ProductState;
  stateExplicit: boolean;
  ambiguous: boolean;
  hint: string | null;
  factor: PreviewFactor | null;
  factorConfirmed: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  evidence: string | null;
  duplicate: boolean;
  outOfYear: boolean;
  unreadable: boolean;
  status: ImportStatus;
  issues: string[];
  preview: LinePreview | null;
}

export interface ImportDraft {
  lines: ImportLine[];
  ignoredSheets: string[];
  notice: string | null;
}

const FOOD_STATE = new Set(["cat1_meat_red", "cat1_meat_white", "cat1_fish_seafood"]);
const UNUSABLE_UNITS = new Set(["lot", "lots", "carton", "cartons", "palette", "palettes", "colis", "piece", "pieces", "pièce", "pièces", "sac", "sacs", "boite", "boites", "boîte", "boîtes"]);
const USABLE_UNITS = new Set(["kwh", "mwh", "gwh", "gj", "l", "litre", "litres", "m3", "m³", "kg", "g", "t", "tonne", "tonnes", "km", "t.km", "tkm", "stere", "stère"]);

export function foldText(value: string): string {
  return value
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function choiceNeedsState(choiceValue: string | null): boolean {
  return FOOD_STATE.has(choiceValue || "");
}

export function importAnnouncement(lines: ImportLine[]): string {
  const ready = lines.filter((line) => line.status === "ready").length;
  const kept = lines.length - ready;
  const readyText = ready > 1 ? `${ready} lignes seront comptées` : `${ready} ligne sera comptée`;
  const keptText = kept > 1 ? `${kept} lignes seront conservées à compléter` : `${kept} ligne sera conservée à compléter`;
  return `${readyText} ; ${keptText}.`;
}

export function emissionCell(line: ImportLine): string {
  if (line.status === "ready" && line.preview?.kg != null) return line.preview.resultLabel;
  return "Non calculées";
}

export function factorCell(line: ImportLine): string {
  if (!line.factor) return "—";
  const label = `${line.factor.value.toLocaleString("fr-FR")} ${line.factor.unit.replace("CO2", "CO₂")}`;
  return line.factorConfirmed ? label : `${label} · non confirmé`;
}

export function matchingLines(lines: ImportLine[], sourceId: string): ImportLine[] {
  const source = lines.find((line) => line.id === sourceId);
  if (!source?.choiceValue || !source.unit) return [];
  return lines.filter((line) => (
    line.id !== source.id
    && line.choiceValue === source.choiceValue
    && foldText(line.unit) === foldText(source.unit)
    && (line.state || "") === (source.state || "")
    && foldText(line.productQuery) === foldText(source.productQuery)
  ));
}

export function buildImportDraft(input: {
  sheets: ImportSheet[];
  activityGroupId: string;
  year: number;
  organizationCountry?: string | null;
}): ImportDraft {
  const ignoredSheets: string[] = [];
  const lines: ImportLine[] = [];
  for (const sheet of input.sheets) {
    if (/exemple/i.test(sheet.name)) {
      ignoredSheets.push(sheet.name);
      continue;
    }
    lines.push(...linesFromSheet(sheet, input));
  }
  return {
    lines: finalize(lines, input.year),
    ignoredSheets,
    notice: lines.length === 0 && ignoredSheets.length > 0
      ? "Aucune ligne à importer : l’onglet des exemples est exclu."
      : null,
  };
}

export function confirmAssociation(lines: ImportLine[], input: {
  lineId: string;
  factor: PreviewFactor | null;
  productQuery: string;
  choiceValue: string | null;
  state: ProductState;
  applyToIdentical: boolean;
  year: number;
}): { lines: ImportLine[]; appliedIds: string[]; blocked: string | null } {
  const current = lines.find((line) => line.id === input.lineId);
  if (!current) return { lines, appliedIds: [], blocked: "Ligne introuvable." };
  if (choiceNeedsState(input.choiceValue) && !input.state) {
    return { lines, appliedIds: [], blocked: "Précisez si le produit est cru ou cuit." };
  }
  if (!input.factor) return { lines, appliedIds: [], blocked: "Choisissez un facteur." };
  const preview = previewLine({ quantity: current.quantity ?? Number.NaN, unit: current.unit, factor: input.factor });
  if (preview.status !== "counted") {
    const next = finalize(lines.map((line) => line.id === current.id ? {
      ...line,
      productQuery: input.productQuery,
      choiceValue: input.choiceValue,
      state: input.state,
      factor: input.factor,
      factorConfirmed: false,
    } : line), input.year);
    return { lines: next, appliedIds: [], blocked: preview.warning || "Le facteur n’est pas compatible avec cette unité." };
  }
  const updatedSource: ImportLine = {
    ...current,
    productQuery: input.productQuery,
    choiceValue: input.choiceValue,
    state: input.state,
    stateExplicit: choiceNeedsState(input.choiceValue) ? true : current.stateExplicit,
    ambiguous: false,
    factor: input.factor,
    factorConfirmed: true,
  };
  const siblings = input.applyToIdentical ? matchingLines(lines.map((line) => line.id === current.id ? updatedSource : line), current.id) : [];
  const appliedIds = [current.id, ...siblings.map((line) => line.id)];
  const next = finalize(lines.map((line) => {
    if (!appliedIds.includes(line.id)) return line;
    return {
      ...line,
      productQuery: input.productQuery,
      choiceValue: input.choiceValue,
      state: input.state,
      stateExplicit: updatedSource.stateExplicit,
      ambiguous: false,
      factor: input.factor,
      factorConfirmed: true,
      productLabel: productLabel({
        choiceValue: input.choiceValue,
        fallback: input.productQuery,
        state: input.state,
        stateExplicit: updatedSource.stateExplicit,
        ambiguous: false,
      }),
    };
  }), input.year);
  return { lines: next, appliedIds, blocked: null };
}

export function lineNotes(line: ImportLine, fileName: string): string {
  const trace = [
    `DESIGNATION: ${line.designation}`,
    `LIGNE_FICHIER: ${fileName}#${line.sourceRow}`,
    line.evidence ? `JUSTIFICATIF: ${line.evidence}` : "",
    line.productLabel ? `PRODUIT: ${line.productLabel}` : "",
    line.state ? `ETAT: ${line.state}` : "",
    line.outOfYear ? "HORS_EXERCICE" : "",
    line.duplicate ? "DOUBLON_POTENTIEL" : "",
  ].filter(Boolean).join("\n");
  if (line.status === "ready" && line.factor) return ademeFactorNote(toAdemeFactor(line.factor), trace) || trace;
  return `A_COMPLETER:\n${trace}`;
}

function toAdemeFactor(factor: PreviewFactor): AdemeFactorRef {
  return {
    id: factor.id,
    name: factor.name,
    value: factor.value,
    unit: factor.unit,
    sourceKey: null,
    sourceName: factor.sourceName,
    datasetVersion: null,
    countryCode: factor.countryCode,
    region: null,
    factorYear: factor.factorYear,
    stableFactorId: factor.stableFactorId,
    replacementReason: null,
  };
}

function linesFromSheet(sheet: ImportSheet, input: { activityGroupId: string; year: number; organizationCountry?: string | null }): ImportLine[] {
  const matrix = sheet.rows.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (matrix.length < 2) return [];
  const headers = matrix[0].map((cell) => headerKey(String(cell ?? "")));
  const columns = {
    start: findHeader(headers, ["debut_de_periode", "date_debut", "periode_debut", "debut"]),
    end: findHeader(headers, ["fin_de_periode", "date_fin", "periode_fin", "fin"]),
    designation: findHeader(headers, ["designation", "libelle", "intitule", "poste"]),
    product: findHeader(headers, ["produit_ou_type", "produit", "type"]),
    quantity: findHeader(headers, ["quantite", "qte"]),
    unit: findHeader(headers, ["unite", "unit"]),
    evidence: findHeader(headers, ["reference_du_justificatif", "justificatif", "reference"]),
  };
  const recognized = columns.designation >= 0 && columns.quantity >= 0;
  return matrix.slice(1).map((row, index) => {
    const sourceRow = index + 2;
    if (!recognized) {
      return blankLine({
        sourceRow,
        designation: row.map((cell) => String(cell ?? "").trim()).filter(Boolean).join(" · "),
        unreadable: true,
        hint: "Format non reconnu. La ligne est conservée.",
      });
    }
    const designation = textAt(row, columns.designation);
    const productText = textAt(row, columns.product);
    const quantityCell = columns.quantity >= 0 ? row[columns.quantity] : "";
    const parsed = parseQuantity(quantityCell);
    const unit = textAt(row, columns.unit) || parsed.unitInValue || "";
    const proposal = proposeProduct({
      designation,
      productText,
      unit,
      activityGroupId: input.activityGroupId,
      organizationCountry: input.organizationCountry,
    });
    const periodStart = parseDate(textAt(row, columns.start));
    const periodEnd = parseDate(textAt(row, columns.end));
    return {
      id: `${sheet.name}-${sourceRow}`,
      sourceRow,
      designation,
      quantity: parsed.quantity,
      unit,
      productQuery: proposal.query,
      productLabel: proposal.label,
      choiceValue: proposal.choiceValue,
      state: proposal.state,
      stateExplicit: proposal.stateExplicit,
      ambiguous: proposal.ambiguous,
      hint: proposal.hint,
      factor: proposal.factor,
      factorConfirmed: false,
      periodStart,
      periodEnd,
      evidence: textAt(row, columns.evidence) || null,
      duplicate: false,
      outOfYear: isOutOfYear(periodStart, periodEnd, input.year),
      unreadable: parsed.unreadable,
      status: "incomplete",
      issues: [],
      preview: null,
    };
  });
}

function proposeProduct(input: {
  designation: string;
  productText: string;
  unit: string;
  activityGroupId: string;
  organizationCountry?: string | null;
}): { choiceValue: string | null; query: string; label: string; state: ProductState; stateExplicit: boolean; ambiguous: boolean; hint: string | null; factor: PreviewFactor | null } {
  const text = foldText(`${input.designation} ${input.productText}`);
  const stateRead = readState(text);
  if (input.activityGroupId === "electricity") {
    const unit = foldText(input.unit).replace("³", "3");
    if (unit === "kwh" || unit === "mwh" || unit === "gwh") {
      const tunisia = proposeTunisiaElectricity(input.organizationCountry, "electricity_grid") && isTunisiaCountry(input.organizationCountry);
      const grid = tunisiaGridFactor();
      return {
        choiceValue: "electricity_grid",
        query: "électricité",
        label: "Électricité",
        state: null,
        stateExplicit: false,
        ambiguous: false,
        hint: null,
        factor: tunisia ? {
          id: grid.id,
          name: "Électricité — Tunisie",
          value: grid.value,
          unit: grid.unit,
          sourceName: grid.sourceName ?? null,
          factorYear: grid.factorYear ?? null,
          countryCode: grid.countryCode ?? null,
          stableFactorId: grid.stableFactorId ?? null,
        } : null,
      };
    }
  }
  const hint = hintFor(input.activityGroupId, text);
  const state = hint?.needsState ? stateRead.state : null;
  const stateExplicit = Boolean(hint?.needsState && stateRead.explicit);
  const label = hint
    ? productLabel({
      choiceValue: hint.choiceValue,
      fallback: hint.label,
      state,
      stateExplicit,
      ambiguous: hint.ambiguous,
    })
    : "Non identifié";
  return {
    choiceValue: hint?.choiceValue || null,
    query: hint?.query || input.productText || "",
    label,
    state,
    stateExplicit,
    ambiguous: hint ? hint.ambiguous : true,
    hint: hint?.hint || (hint ? null : "Indiquez le produit et une quantité exploitable."),
    factor: null,
  };
}

function productLabel(input: { choiceValue: string | null; fallback: string; state: ProductState; stateExplicit: boolean; ambiguous: boolean }): string {
  if (!input.choiceValue && input.ambiguous) return input.fallback || "Non identifié";
  const name = findChoice(input.choiceValue || "")?.label || input.fallback;
  const short = input.fallback || name;
  if (choiceNeedsState(input.choiceValue) && !input.stateExplicit) {
    return `${short}${input.state ? ` ${input.state}` : ""} — à préciser`;
  }
  if (input.state) return `${short} ${input.state}`;
  return short;
}

function hintFor(groupId: string, text: string): { choiceValue: string | null; query: string; label: string; needsState?: boolean; ambiguous: boolean; hint?: string } | null {
  const table = groupId === "purchases" ? PURCHASE_HINTS : groupId === "fuels" ? FUEL_HINTS : groupId === "combustion" ? COMBUSTION_HINTS : [];
  return table.find((item) => item.pattern.test(text)) || null;
}

const PURCHASE_HINTS = [
  { pattern: /\bboeuf\b/, choiceValue: "cat1_meat_red", query: "bœuf", label: "Bœuf", needsState: true, ambiguous: false },
  { pattern: /\bagneau\b/, choiceValue: "cat1_meat_red", query: "agneau", label: "Agneau", needsState: true, ambiguous: false },
  { pattern: /\b(poulet|volaille|dinde)\b/, choiceValue: "cat1_meat_white", query: "volaille", label: "Volaille", needsState: true, ambiguous: false },
  { pattern: /\bporc\b/, choiceValue: "cat1_meat_white", query: "porc", label: "Porc", needsState: true, ambiguous: false },
  { pattern: /\b(poisson|crevette)\b/, choiceValue: "cat1_fish_seafood", query: "poisson", label: "Poisson", needsState: true, ambiguous: false },
  { pattern: /\blait\b/, choiceValue: "cat1_dairy_eggs", query: "lait entier", label: "Lait entier", ambiguous: false },
  { pattern: /\b(fromage|yaourt|oeuf)\b/, choiceValue: "cat1_dairy_eggs", query: "produits laitiers", label: "Produits laitiers et œufs", ambiguous: false },
  { pattern: /\bviande\b/, choiceValue: null, query: "", label: "À préciser", ambiguous: true, hint: "Indiquez de quelle viande il s’agit." },
  { pattern: /\b(divers|autre)\b/, choiceValue: null, query: "", label: "Non identifié", ambiguous: true, hint: "Indiquez le produit et une quantité exploitable." },
];

const FUEL_HINTS = [
  { pattern: /\b(diesel|gazole|gasoil)\b/, choiceValue: "fuel_diesel", query: "diesel", label: "Diesel", ambiguous: false },
  { pattern: /\bessence\b/, choiceValue: "fuel_gasoline", query: "essence", label: "Essence", ambiguous: false },
  { pattern: /\bgpl\b/, choiceValue: "fuel_lpg", query: "gpl", label: "GPL", ambiguous: false },
];

const COMBUSTION_HINTS = [
  { pattern: /\bgaz\b/, choiceValue: "fossil_gas", query: "gaz naturel", label: "Gaz naturel", ambiguous: false },
  { pattern: /\b(fioul|mazout)\b/, choiceValue: "fossil_fuel_oil_light", query: "fioul", label: "Fioul", ambiguous: false },
  { pattern: /\bbois\b/, choiceValue: "biomass_wood", query: "bois", label: "Bois énergie", ambiguous: false },
];

function readState(text: string): { state: ProductState; explicit: boolean } {
  if (/\b(cuit|cuite|grille|roti|braise)\b/.test(text)) return { state: "cuit", explicit: true };
  if (/\b(cru|crue)\b/.test(text)) return { state: "cru", explicit: true };
  if (/\b(frais|fraiche)\b/.test(text)) return { state: "cru", explicit: false };
  return { state: null, explicit: false };
}

function finalize(lines: ImportLine[], year: number): ImportLine[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = [foldText(line.designation), line.quantity ?? "", foldText(line.unit), line.periodStart || "", line.periodEnd || ""].join("|");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return lines.map((line) => {
    const key = [foldText(line.designation), line.quantity ?? "", foldText(line.unit), line.periodStart || "", line.periodEnd || ""].join("|");
    return refreshLine({
      ...line,
      duplicate: Boolean(line.designation) && (counts.get(key) || 0) > 1,
      outOfYear: isOutOfYear(line.periodStart, line.periodEnd, year),
      productLabel: line.productLabel || productLabel({
        choiceValue: line.choiceValue,
        fallback: line.productQuery,
        state: line.state,
        stateExplicit: line.stateExplicit,
        ambiguous: line.ambiguous,
      }),
    });
  });
}

function refreshLine(line: ImportLine): ImportLine {
  const issues: string[] = [];
  const unitKey = foldText(line.unit).replace("³", "3");
  const usable = USABLE_UNITS.has(unitKey);
  const unusable = !line.unit || UNUSABLE_UNITS.has(unitKey) || !usable;
  if (line.unreadable) issues.push(line.hint || "Ligne illisible");
  if (!line.designation) issues.push("Désignation manquante");
  if (line.quantity == null || line.quantity <= 0) issues.push("Quantité manquante");
  if (unusable) issues.push(line.unit ? `L’unité « ${line.unit} » n’est pas convertie.` : "Unité manquante");
  if (line.outOfYear) issues.push("Date hors exercice");
  if (line.duplicate) issues.push("Doublon potentiel");
  if (!line.choiceValue) issues.push(line.hint || "Produit à préciser");
  const preview = line.factor
    ? previewLine({ quantity: line.quantity ?? Number.NaN, unit: line.unit, factor: line.factor })
    : null;
  if (preview?.status === "incompatible" && preview.warning) issues.push(preview.warning);
  const detailOpen = choiceNeedsState(line.choiceValue) && !line.stateExplicit;
  let status: ImportStatus = "incomplete";
  if (!line.unreadable && !unusable && line.quantity != null && line.quantity > 0 && line.choiceValue && !line.outOfYear) {
    if (detailOpen || !line.factorConfirmed || preview?.status !== "counted") status = "confirm";
    else status = "ready";
  }
  if (preview?.status === "incompatible") status = "incomplete";
  return { ...line, issues: Array.from(new Set(issues)), status, preview };
}

function blankLine(input: { sourceRow: number; designation: string; unreadable: boolean; hint: string }): ImportLine {
  return {
    id: `unreadable-${input.sourceRow}-${foldText(input.designation).slice(0, 24)}`,
    sourceRow: input.sourceRow,
    designation: input.designation,
    quantity: null,
    unit: "",
    productQuery: "",
    productLabel: "Non identifié",
    choiceValue: null,
    state: null,
    stateExplicit: false,
    ambiguous: true,
    hint: input.hint,
    factor: null,
    factorConfirmed: false,
    periodStart: null,
    periodEnd: null,
    evidence: null,
    duplicate: false,
    outOfYear: false,
    unreadable: input.unreadable,
    status: "incomplete",
    issues: [],
    preview: null,
  };
}

function findHeader(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.some((alias) => header === alias || header.includes(alias)));
}

function headerKey(value: string): string {
  return foldText(value).replace(/\*/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function textAt(row: unknown[], index: number): string {
  if (index < 0) return "";
  return String(row[index] ?? "").trim();
}

function parseQuantity(value: unknown): { quantity: number | null; unitInValue: string | null; unreadable: boolean } {
  if (typeof value === "number" && Number.isFinite(value)) return { quantity: value, unitInValue: null, unreadable: false };
  const text = String(value ?? "").trim();
  if (!text) return { quantity: null, unitInValue: null, unreadable: false };
  const match = text.match(/^(-?\d+(?:[\s\u00a0]\d{3})*(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return { quantity: null, unitInValue: null, unreadable: true };
  const quantity = Number(match[1].replace(/[\s\u00a0]/g, "").replace(",", "."));
  if (!Number.isFinite(quantity)) return { quantity: null, unitInValue: null, unreadable: true };
  return { quantity, unitInValue: match[2].trim() || null, unreadable: false };
}

function parseDate(value: string): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const french = value.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (french) return `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
  return null;
}

function isOutOfYear(start: string | null, end: string | null, year: number): boolean {
  const years = [start, end].map((value) => Number((value || "").slice(0, 4))).filter((value) => Number.isInteger(value) && value > 1900);
  return years.some((value) => value !== year);
}

export const IMPORT_GUIDES: Record<string, { expected: string; units: string; example: string }> = {
  electricity: {
    expected: "Une ligne correspond à une consommation d’électricité. La désignation peut être le libellé de votre facture.",
    units: "kWh ou MWh. Une unité comme « lot » n’est pas convertie.",
    example: "Facture réseau · 23 208 kWh",
  },
  combustion: {
    expected: "Une ligne correspond à une consommation de combustible : gaz, fioul, bois.",
    units: "m³, L, kg ou tonne, selon le combustible.",
    example: "Chaudière gaz · 1 200 m³",
  },
  fuels: {
    expected: "Une ligne correspond à un plein ou une consommation de carburant. Le type de carburant doit être précisé.",
    units: "Litres ou tonnes. Le nom du fichier ne choisit pas le facteur.",
    example: "Carte gasoil véhicules · 800 L",
  },
  purchases: {
    expected: "Une ligne correspond à un achat. La désignation libre est conservée ; le produit est associé ensuite.",
    units: "kg, L ou tonne. « 1 lot » n’est pas converti en kilogrammes.",
    example: "Achat lait cuisine · 30 L",
  },
  travel: {
    expected: "Une ligne correspond à un déplacement. Précisez le mode : train, avion, voiture.",
    units: "km ou passager.km.",
    example: "Mission Lyon · 640 km",
  },
  freight: {
    expected: "Une ligne correspond à un transport de marchandises.",
    units: "km ou t.km.",
    example: "Livraison client · 120 t.km",
  },
  waste: {
    expected: "Une ligne correspond à un enlèvement de déchets.",
    units: "kg ou tonne.",
    example: "Déchets alimentaires · 400 kg",
  },
  other: {
    expected: "Une ligne correspond à une opération. Précisez le type : chaleur, froid, fluide ou procédé.",
    units: "Selon le type choisi. Les unités incompatibles sont bloquées.",
    example: "Appoint chaleur réseau · 8 000 kWh",
  },
};
