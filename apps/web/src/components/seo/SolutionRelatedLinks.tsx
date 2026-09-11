import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SOLUTION_MODULES, SOLUTION_SECTORS } from "@/config/solutionPages";

type Props = {
  currentPath?: string;
  showSectors?: boolean;
  showModules?: boolean;
};

export const SolutionRelatedLinks: React.FC<Props> = ({
  currentPath,
  showSectors = true,
  showModules = true,
}) => {
  const sectors = SOLUTION_SECTORS.filter((s) => s.path !== currentPath);
  const modules = SOLUTION_MODULES.filter((m) => m.path !== currentPath);

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        {showSectors && (
          <>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Solutions par secteur
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Pages marketing dédiées pour relier votre métier aux modules CarboScan.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
              {sectors.map((sector) => (
                <Link
                  key={sector.path}
                  to={sector.path}
                  className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
                >
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary">
                    {sector.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">{sector.blurb}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        {showModules && (
          <>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Modules de la plateforme
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Du bilan organisationnel à l’empreinte produit, la collecte et le suivi énergétique.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map((mod) => (
                <Link
                  key={mod.path}
                  to={mod.path}
                  className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
                >
                  <h3 className="font-semibold text-foreground mb-1 inline-flex items-center gap-1 group-hover:text-primary">
                    {mod.label}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
                  </h3>
                  <p className="text-sm text-muted-foreground">{mod.blurb}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
