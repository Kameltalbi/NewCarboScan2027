import {
  CAT1_PURCHASED_GOODS,
  CAT2_CAPITAL_GOODS,
  CAT4_UPSTREAM_TRANSPORT,
  CAT5_WASTE,
  CAT6_BUSINESS_TRAVEL,
  CAT7_COMMUTING,
  CAT9_DOWNSTREAM_TRANSPORT,
  getAllSubcategories,
} from "@/lib/scope3/subcategories";
import type { ActivityCategory, ActivityType } from "@/lib/activity-data/types";
import { SCOPE1_CATEGORIES } from "@/modules/collect/components/Scope1DataEntry";
import { SCOPE2_CATEGORIES } from "@/modules/collect/components/Scope2DataEntry";

export interface ActivityChoice {
  value: string;
  label: string;
  defaultUnit: string;
  alternativeUnits: string[];
  scope: 1 | 2 | 3;
  activityType: ActivityType;
  category: ActivityCategory;
  subcategory: string;
  kind: "standard" | "process";
}

export interface ActivityGroup {
  id: string;
  label: string;
  choices: ActivityChoice[];
}

function choice(partial: ActivityChoice): ActivityChoice {
  return partial;
}

function fromScope1(groupId: string, activityType: ActivityType): ActivityChoice[] {
  const group = SCOPE1_CATEGORIES.find((item) => item.id === groupId);
  if (!group) return [];
  if (group.subcategories.length === 0) {
    return [choice({
      value: "process_other",
      label: "Procédé",
      defaultUnit: "kg",
      alternativeUnits: [],
      scope: 1,
      activityType: "process",
      category: "scope1",
      subcategory: "process_other",
      kind: "process",
    })];
  }
  return group.subcategories.map((item) => choice({
    value: item.value,
    label: item.label,
    defaultUnit: item.defaultUnit,
    alternativeUnits: item.alternativeUnits || [],
    scope: 1,
    activityType,
    category: "scope1",
    subcategory: item.value,
    kind: "standard",
  }));
}

function fromScope2(): ActivityChoice[] {
  return SCOPE2_CATEGORIES.flatMap((group) => group.subcategories.map((item) => choice({
    value: item.value,
    label: item.label,
    defaultUnit: item.defaultUnit,
    alternativeUnits: item.alternativeUnits || [],
    scope: 2,
    activityType: "energy",
    category: "scope2",
    subcategory: item.value,
    kind: "standard",
  })));
}

function scope3Category(categoryId: string): ActivityCategory {
  return /^cat(9|10|11|12|13|14|15)_/.test(categoryId) ? "scope3_downstream" : "scope3_upstream";
}

function fromScope3(items: { value: string; label: string; categoryId: string; defaultUnit: string; alternativeUnits?: string[] }[], activityType: ActivityType): ActivityChoice[] {
  return items.map((item) => choice({
    value: item.value,
    label: item.label,
    defaultUnit: item.defaultUnit,
    alternativeUnits: item.alternativeUnits || [],
    scope: 3,
    activityType,
    category: scope3Category(item.categoryId),
    subcategory: `${item.categoryId}:${item.value}`,
    kind: "standard",
  }));
}

const FOOD = new Set([
  "cat1_meat_red", "cat1_meat_white", "cat1_fish_seafood", "cat1_dairy_eggs",
  "cat1_fruit_vegetables", "cat1_grocery_staples", "cat1_oils_fats", "cat1_bakery",
  "cat1_soft_drinks", "cat1_alcoholic_drinks", "cat1_coffee_tea", "cat1_food_beverages",
]);

const usedScope3 = new Set<string>();

function takeScope3(items: ActivityChoice[]): ActivityChoice[] {
  for (const item of items) usedScope3.add(item.value);
  return items;
}

const scope2Choices = fromScope2();
const electricity = scope2Choices.filter((item) => item.subcategory.startsWith("electricity"));
const heatAndCold = scope2Choices.filter((item) => !item.subcategory.startsWith("electricity"));
const fuels = fromScope1("vehicle_fuels", "fuel");
const combustion = [...fromScope1("fossil_fuels", "energy"), ...fromScope1("biomass", "energy")];
const purchases = takeScope3([
  ...fromScope3(CAT1_PURCHASED_GOODS.filter((item) => FOOD.has(item.value)), "purchase"),
  ...fromScope3(CAT1_PURCHASED_GOODS.filter((item) => !FOOD.has(item.value)), "purchase"),
  ...fromScope3(CAT2_CAPITAL_GOODS, "purchase"),
]);
const travel = takeScope3([
  ...fromScope3(CAT6_BUSINESS_TRAVEL, "transport"),
  ...fromScope3(CAT7_COMMUTING, "transport"),
]);
const freight = takeScope3([
  ...fromScope3(CAT4_UPSTREAM_TRANSPORT, "transport"),
  ...fromScope3(CAT9_DOWNSTREAM_TRANSPORT, "transport"),
]);
const waste = takeScope3(fromScope3(CAT5_WASTE, "waste"));
const fugitive = fromScope1("fugitive", "process");
const process = fromScope1("process_other", "process");
const remaining = takeScope3(fromScope3(
  getAllSubcategories().filter((item) => !usedScope3.has(item.value) && item.categoryId !== "cat3_fuel_energy"),
  "purchase",
));

export const ACTIVITY_GROUPS: ActivityGroup[] = [
  { id: "electricity", label: "Électricité", choices: electricity },
  { id: "combustion", label: "Combustibles", choices: combustion },
  { id: "fuels", label: "Carburants", choices: fuels },
  { id: "purchases", label: "Achats", choices: purchases },
  { id: "travel", label: "Déplacements", choices: travel },
  { id: "freight", label: "Transport", choices: freight },
  { id: "waste", label: "Déchets", choices: waste },
  { id: "other", label: "Autres activités", choices: [...heatAndCold, ...fugitive, ...process, ...remaining] },
];

export function findChoice(value: string): ActivityChoice | null {
  for (const group of ACTIVITY_GROUPS) {
    const found = group.choices.find((item) => item.value === value);
    if (found) return found;
  }
  return null;
}
