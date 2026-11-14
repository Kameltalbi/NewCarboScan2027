import { SCOPE_1_POSTES, SCOPE_2_POSTES } from "@/lib/bilan-carbone/ghg-hierarchy";
import { GHG_SCOPE3_CATEGORIES } from "@/lib/scope3/ghg-protocol-categories";
import type { ActivityChoice } from "@/modules/collect/activityGroups";
import { ACTIVITY_GROUPS } from "@/modules/collect/activityGroups";
import { SCOPE1_CATEGORIES } from "@/modules/collect/components/Scope1DataEntry";
import { SCOPE2_CATEGORIES } from "@/modules/collect/components/Scope2DataEntry";
import { foldText } from "./importReview";

export type CollectEntryMode = "fields" | "process" | "automatic";

export interface CollectCategory {
  id: string;
  scope: 1 | 2 | 3;
  officialNumber: string | null;
  label: string;
  explanation: string;
  examples: string;
  searchTerms: string[];
  choices: ActivityChoice[];
  mode: CollectEntryMode;
}

const SCOPE1_SOURCE: Record<string, string> = {
  "poste-1-1": "fossil_fuels",
  "poste-1-2": "vehicle_fuels",
  "poste-1-3": "process_other",
  "poste-1-4": "fugitive",
  "poste-1-5": "biomass",
};

const RECENT_LIMIT = 4;

function allChoices(): ActivityChoice[] {
  return ACTIVITY_GROUPS.flatMap((group) => group.choices);
}

function choicesForValues(values: string[]): ActivityChoice[] {
  const wanted = new Set(values);
  return allChoices().filter((choice) => wanted.has(choice.value) || wanted.has(choice.subcategory));
}

function scope1Choices(posteId: string): ActivityChoice[] {
  const sourceId = SCOPE1_SOURCE[posteId];
  const source = SCOPE1_CATEGORIES.find((item) => item.id === sourceId);
  const values = (source?.subcategories ?? []).map((item) => item.value);
  if (sourceId === "process_other") values.push("process_other");
  return choicesForValues(values);
}

function scope2Choices(posteId: string): ActivityChoice[] {
  if (posteId === "poste-2-1") {
    return allChoices().filter((choice) => choice.subcategory.startsWith("electricity"));
  }
  const values = SCOPE2_CATEGORIES
    .filter((item) => item.id === "heat" || item.id === "cooling")
    .flatMap((item) => item.subcategories.map((sub) => sub.value));
  return choicesForValues(values);
}

function scope3Choices(categoryId: string): ActivityChoice[] {
  const prefix = `${categoryId}:`;
  return allChoices().filter((choice) => choice.subcategory.startsWith(prefix));
}

function modeFor(choices: ActivityChoice[]): CollectEntryMode {
  if (choices.length === 0) return "automatic";
  if (choices.length === 1 && choices[0].kind === "process") return "process";
  return "fields";
}

function firstSentence(value: string): string {
  const sentence = value.split(/(?<=\.)\s/)[0]?.trim() || value.trim();
  return sentence.length > 160 ? `${sentence.slice(0, 157).trim()}…` : sentence;
}

function build(partial: Omit<CollectCategory, "mode" | "examples"> & { exampleLabels: string[] }): CollectCategory {
  return {
    id: partial.id,
    scope: partial.scope,
    officialNumber: partial.officialNumber,
    label: partial.label,
    explanation: partial.explanation,
    examples: partial.exampleLabels.slice(0, 4).join(", "),
    searchTerms: partial.searchTerms,
    choices: partial.choices,
    mode: modeFor(partial.choices),
  };
}

let cached: CollectCategory[] | null = null;

export function collectCatalog(): CollectCategory[] {
  if (cached) return cached;
  const scope1 = SCOPE_1_POSTES.map((poste) => {
    const choices = scope1Choices(poste.id);
    const labels = choices.map((choice) => choice.label);
    return build({
      id: poste.id,
      scope: 1,
      officialNumber: null,
      label: poste.name,
      explanation: poste.id === "poste-1-5"
        ? "Combustion de bois, granulés ou biogaz sur le site."
        : firstSentence(poste.description),
      exampleLabels: labels,
      searchTerms: [poste.name, poste.description, ...labels],
      choices,
    });
  });
  const scope2 = SCOPE_2_POSTES.map((poste) => {
    const choices = scope2Choices(poste.id);
    const labels = choices.map((choice) => choice.label);
    return build({
      id: poste.id,
      scope: 2,
      officialNumber: null,
      label: poste.name,
      explanation: firstSentence(poste.description),
      exampleLabels: labels,
      searchTerms: [poste.name, poste.description, ...labels],
      choices,
    });
  });
  const scope3 = GHG_SCOPE3_CATEGORIES.map((category) => {
    const choices = scope3Choices(category.id);
    const labels = choices.map((choice) => choice.label);
    return build({
      id: category.id,
      scope: 3,
      officialNumber: String(category.number),
      label: category.name,
      explanation: firstSentence(category.description),
      exampleLabels: labels.length > 0 ? labels : [category.activationHint],
      searchTerms: [category.name, category.description, category.activationHint, ...labels],
      choices,
    });
  });
  cached = [...scope1, ...scope2, ...scope3];
  return cached;
}

export function categorySecondary(category: CollectCategory): string {
  if (category.scope === 3 && category.officialNumber) {
    return `Scope 3 · n° ${category.officialNumber}`;
  }
  return `Scope ${category.scope}`;
}

export function categorySuggestions(
  categories: CollectCategory[],
  enabledIds: string[],
  query: string,
): { visible: CollectCategory[]; hidden: CollectCategory[] } {
  const enabled = new Set(enabledIds);
  const tokens = foldText(query).split(/\s+/).filter(Boolean);
  const matched = tokens.length === 0
    ? categories
    : categories.filter((category) => {
      const haystack = foldText([
        category.label,
        category.explanation,
        category.examples,
        categorySecondary(category),
        ...category.searchTerms,
      ].join("\n"));
      return tokens.every((token) => haystack.includes(token));
    });
  if (tokens.length === 0) {
    return {
      visible: matched.filter((category) => enabled.has(category.id)),
      hidden: [],
    };
  }
  return {
    visible: matched.filter((category) => enabled.has(category.id)),
    hidden: matched.filter((category) => !enabled.has(category.id)),
  };
}

export function sanitizeCollectCategoryIds(ids: string[]): string[] {
  const known = new Set(collectCatalog().map((category) => category.id));
  const kept: string[] = [];
  for (const id of ids) {
    if (known.has(id) && !kept.includes(id)) kept.push(id);
  }
  return kept;
}

export function enableCategory(enabledIds: string[], categoryId: string): string[] {
  return sanitizeCollectCategoryIds([...enabledIds, categoryId]);
}

export function rememberCategory(current: string[], categoryId: string): string[] {
  return [categoryId, ...current.filter((id) => id !== categoryId)].slice(0, RECENT_LIMIT);
}

export function recentCategoryKey(organizationId: string): string {
  return `collect-recent-categories:${organizationId}`;
}

export function readRecentCategoryIds(organizationId: string): string[] {
  try {
    const raw = localStorage.getItem(recentCategoryKey(organizationId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? sanitizeCollectCategoryIds(parsed.map(String)).slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export function writeRecentCategoryIds(organizationId: string, ids: string[]): void {
  localStorage.setItem(recentCategoryKey(organizationId), JSON.stringify(sanitizeCollectCategoryIds(ids).slice(0, RECENT_LIMIT)));
}
