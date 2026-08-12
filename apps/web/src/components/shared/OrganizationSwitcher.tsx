import React from "react";
import { Building2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/contexts/AppDataContext";
import { cn } from "@/lib/utils";

export const OrganizationSwitcher: React.FC = () => {
  const { 
    allOrganizations, 
    currentOrganization, 
    switchOrganization, 
    organizationLoading 
  } = useAppData();

  if (organizationLoading || allOrganizations.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 max-w-[200px] h-8 text-xs font-medium"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {currentOrganization?.name || "Organisation"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Vos organisations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allOrganizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.id)}
            className={cn(
              "cursor-pointer gap-2",
              org.id === currentOrganization?.id && "bg-accent"
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium text-sm">{org.name}</span>
              {org.sector && (
                <span className="text-xs text-muted-foreground truncate">
                  {org.sector}
                </span>
              )}
            </div>
            {org.id === currentOrganization?.id && (
              <span className="ml-auto text-xs text-primary">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
