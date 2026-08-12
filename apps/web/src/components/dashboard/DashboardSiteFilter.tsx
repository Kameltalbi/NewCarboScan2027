// Sélecteur de site pour filtrer le dashboard par site ou vue consolidée

import React from 'react';
import { Building2, Check, ChevronsUpDown, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DashboardSite {
  id: string;
  name: string;
}

interface DashboardSiteFilterProps {
  sites: DashboardSite[];
  selectedSiteId: string | null; // null = vue consolidée
  onSiteChange: (siteId: string | null) => void;
  isLoading?: boolean;
}

export const DashboardSiteFilter: React.FC<DashboardSiteFilterProps> = ({
  sites,
  selectedSiteId,
  onSiteChange,
  isLoading = false,
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedSite = selectedSiteId 
    ? sites.find(s => s.id === selectedSiteId) 
    : null;

  const displayLabel = selectedSite?.name || 'Tous les sites (consolidé)';

  // Si moins de 2 sites, afficher juste un label simple (pas de dropdown)
  if (sites.length < 2) {
    return (
      <Button variant="outline" disabled className="w-[200px] justify-start gap-2">
        <Layers className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{sites.length === 1 ? sites[0].name : 'Aucun site'}</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[260px] justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedSiteId ? (
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <Layers className="h-4 w-4 shrink-0 text-primary" />
            )}
            <span className="truncate">{displayLabel}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un site..." />
          <CommandList>
            <CommandEmpty>Aucun site trouvé.</CommandEmpty>
            
            {/* Option consolidée */}
            <CommandGroup heading="Vue globale">
              <CommandItem
                value="__consolidated__"
                onSelect={() => {
                  onSiteChange(null);
                  setOpen(false);
                }}
                className="gap-2"
              >
                <Layers className="h-4 w-4 text-primary" />
                <span className="font-medium">Tous les sites (consolidé)</span>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    selectedSiteId === null ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Liste des sites */}
            <CommandGroup heading="Par site">
              {sites.map((site) => (
                <CommandItem
                  key={site.id}
                  value={site.name}
                  onSelect={() => {
                    onSiteChange(site.id);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{site.name}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedSiteId === site.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
