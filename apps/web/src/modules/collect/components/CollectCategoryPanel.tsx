import React, { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  categorySecondary,
  collectCatalog,
  type CollectCategory,
} from "@/lib/collect/collectCategories";
import { foldText } from "@/lib/collect/importReview";

const SECTIONS = [
  { id: "s3", scope: 3 as const, title: "Autres émissions indirectes — Scope 3" },
];

function matches(category: CollectCategory, query: string): boolean {
  const tokens = foldText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = foldText([
    category.label,
    category.explanation,
    category.examples,
    categorySecondary(category),
    ...category.searchTerms,
  ].join("\n"));
  return tokens.every((token) => haystack.includes(token));
}

export function CollectCategoryPanel({
  open,
  onOpenChange,
  selectedIds,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  saving: boolean;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const catalog = useMemo(() => collectCatalog().filter((category) => category.scope === 3), []);
  const scope3Ids = useMemo(() => new Set(catalog.map((category) => category.id)), [catalog]);
  const [draft, setDraft] = useState<string[]>(selectedIds.filter((id) => scope3Ids.has(id)));
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Record<string, boolean>>({ s1: true, s2: true, s3: true });

  useEffect(() => {
    if (!open) return;
    setDraft(selectedIds.filter((id) => scope3Ids.has(id)));
    setQuery("");
    setOpened({ s1: true, s2: true, s3: true });
  }, [open, selectedIds, scope3Ids]);

  useEffect(() => {
    if (query.trim()) setOpened({ s1: true, s2: true, s3: true });
  }, [query]);

  const toggle = (id: string, checked: boolean) => {
    setDraft((current) => checked ? [...current, id].filter((item, index, list) => list.indexOf(item) === index) : current.filter((item) => item !== id));
  };

  const countLabel = draft.length > 1
    ? `${draft.length} catégories sélectionnées`
    : `${draft.length} catégorie sélectionnée`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-3 border-b p-4 pr-12 text-left">
          <SheetTitle>Gérer mes catégories</SheetTitle>
          <SheetDescription>
            Sélectionnez les catégories du Scope 3 à afficher dans votre collecte. Une catégorie non sélectionnée n’est pas automatiquement considérée comme non applicable au bilan.
          </SheetDescription>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une catégorie ou un exemple"
            aria-label="Rechercher une catégorie"
          />
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {SECTIONS.map((section) => {
            const items = catalog.filter((category) => category.scope === section.scope && matches(category, query));
            if (items.length === 0) return null;
            return (
              <Collapsible
                key={section.id}
                open={opened[section.id]}
                onOpenChange={(next) => setOpened((current) => ({ ...current, [section.id]: next }))}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-left text-sm font-medium">
                  {section.title}
                  <ChevronDown className={`h-4 w-4 transition ${opened[section.id] ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="divide-y">
                    {items.map((category) => {
                      const checked = draft.includes(category.id);
                      return (
                        <li key={category.id} className="flex gap-3 py-3">
                          <Checkbox
                            id={`collect-category-${category.id}`}
                            checked={checked}
                            onCheckedChange={(value) => toggle(category.id, value === true)}
                            aria-label={category.label}
                            className="mt-0.5"
                          />
                          <label htmlFor={`collect-category-${category.id}`} className="min-w-0 cursor-pointer">
                            <span className="block text-sm font-medium">{category.label}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{category.explanation}</span>
                            {category.examples ? (
                              <span className="mt-0.5 block text-xs text-muted-foreground">Exemples : {category.examples}</span>
                            ) : null}
                            <span className="mt-0.5 block text-xs text-muted-foreground">{categorySecondary(category)}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{countLabel}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
            <Button type="button" disabled={saving} onClick={() => onSave(draft)}>Enregistrer</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
