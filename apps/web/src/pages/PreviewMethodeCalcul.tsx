/**
 * Prévisualisation locale (hors auth) — à retirer après validation produit.
 */
import React from "react";
import { BookOpen, BarChart3, FileBarChart, Landmark, LayoutDashboard, Users } from "lucide-react";
import { MethodeCalculPage } from "@/modules/fournisseurs/MethodeCalculPage";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Méthode de calcul", icon: BookOpen, active: true },
  { label: "Vue d'ensemble", icon: LayoutDashboard },
  { label: "Portefeuille", icon: Landmark },
  { label: "Contreparties", icon: Users },
  { label: "Qualité des données", icon: BarChart3 },
  { label: "Rapport", icon: FileBarChart },
] as const;

export default function PreviewMethodeCalcul() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <p className="text-sm font-semibold tracking-tight">CarboScan · Banque Atlas</p>
            <p className="text-xs text-muted-foreground">Prévisualisation locale</p>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = "active" in item && item.active;
              return (
                <span
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="container mx-auto px-4 py-6">
        <MethodeCalculPage />
      </main>
    </div>
  );
}
