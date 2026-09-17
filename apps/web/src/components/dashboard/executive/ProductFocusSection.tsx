// Zone 3 - Focus Produits
// Shows PCF study data when Empreinte Produit module is active

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, BarChart3, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PCFStudySummary {
  id: string;
  name: string;
  status: string;
  total_emissions: number | null;
  functional_unit: string | null;
  updated_at: string;
}

interface ProductFocusSectionProps {
  studies: PCFStudySummary[];
  isModuleActive: boolean;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
  calculated: { label: 'Calculée', className: 'bg-emerald-100 text-emerald-800' },
  locked: { label: 'Verrouillée', className: 'bg-primary/10 text-primary' },
};

export const ProductFocusSection: React.FC<ProductFocusSectionProps> = ({
  studies,
  isModuleActive,
}) => {
  const navigate = useNavigate();

  // If module not active, show discrete CTA
  if (!isModuleActive) {
    return (
      <div className="bg-card border rounded p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Empreinte Produit</h3>
              <p className="text-xs text-muted-foreground">
                Calculez l'empreinte carbone de vos produits par unité fonctionnelle
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/contact')}
            className="text-xs gap-2"
          >
            Découvrir
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Module active but no studies
  if (studies.length === 0) {
    return (
      <div className="bg-card border rounded p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Focus Produits
          </h3>
        </div>
        <div className="text-center py-6">
          <FlaskConical className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Aucune étude produit disponible
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/app/empreinte-produit/nouvelle-etude')}
            className="gap-2"
          >
            <Package className="h-3 w-3" />
            Créer une étude
          </Button>
        </div>
      </div>
    );
  }

  // Sort by emissions desc, take top 3
  const topStudies = [...studies]
    .filter(s => s.total_emissions !== null && s.total_emissions > 0)
    .sort((a, b) => (b.total_emissions || 0) - (a.total_emissions || 0))
    .slice(0, 3);

  const calculatedCount = studies.filter(s => s.status === 'calculated' || s.status === 'locked').length;
  const maxEmission = topStudies.length > 0 ? (topStudies[0].total_emissions || 1) : 1;

  return (
    <div className="bg-card border rounded p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Focus Produits
          </h3>
          <span className="text-xs text-muted-foreground">
            {calculatedCount}/{studies.length} calculées
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/empreinte-produit')}
          className="text-xs gap-1 text-muted-foreground hover:text-foreground"
        >
          Voir tout
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Top emitters */}
      {topStudies.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            Top produits émetteurs
          </p>
          {topStudies.map((study) => {
            const pct = maxEmission > 0 ? ((study.total_emissions || 0) / maxEmission) * 100 : 0;
            const statusInfo = STATUS_LABELS[study.status] || STATUS_LABELS.draft;

            return (
              <div
                key={study.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2 transition-colors"
                onClick={() => navigate(`/app/empreinte-produit/etude/${study.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {study.name}
                    </span>
                    <span className={cn(
                      'inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded',
                      statusInfo.className
                    )}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary rounded-full h-1.5 transition-all"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                  {(study.total_emissions || 0).toFixed(1)} kgCO₂e
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Aucun résultat de calcul disponible
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-xs gap-2"
            onClick={() => navigate('/app/empreinte-produit')}
          >
            <BarChart3 className="h-3 w-3" />
            Accéder aux études
          </Button>
        </div>
      )}
    </div>
  );
};
