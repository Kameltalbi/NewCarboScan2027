import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanBadge } from './PlanBadge';
import { PlanFeatureGuard } from './PlanFeatureGuard';
import { usePlanAccess } from '@/shared/hooks/usePlanAccess';
import { 
  BarChart3, 
  Settings, 
  Users, 
  Building2, 
  Zap, 
  FileText,
  Activity,
  Crown,
  Download,
  GitCompare,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  companyName?: string;
  period?: string;
  onExport?: () => void;
  onCompare?: () => void;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  availableYears?: number[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  title = "Tableau de bord",
  subtitle,
  companyName,
  period,
  onExport,
  onCompare,
  selectedYear,
  onYearChange,
  availableYears = [],
}) => {
  const { userPlan, hasFeature } = usePlanAccess();

  const getDashboardFeatures = () => {
    const features = [
      {
        key: 'basic',
        title: 'Bilan Carbone',
        description: 'Scopes 1, 2 & 3',
        icon: <BarChart3 className="h-4 w-4" />,
        available: true
      },
      {
        key: 'scope3',
        title: 'Scope 3',
        description: 'Émissions indirectes',
        icon: <Zap className="h-4 w-4" />,
        available: hasFeature('canAccessScope3')
      },
      {
        key: 'advanced_reports',
        title: 'Rapports avancés',
        description: 'Analyses détaillées',
        icon: <FileText className="h-4 w-4" />,
        available: hasFeature('canAccessAdvancedReports')
      },
      {
        key: 'multi_sites',
        title: 'Multi-sites',
        description: 'Gestion centralisée',
        icon: <Building2 className="h-4 w-4" />,
        available: hasFeature('canAccessMultiSites')
      },
      {
        key: 'expert_support',
        title: 'Support expert',
        description: 'Accompagnement personnalisé',
        icon: <Crown className="h-4 w-4" />,
        available: hasFeature('canAccessExpertSupport')
      }
    ];

    return features;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header du dashboard */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              {companyName ? (
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{companyName}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>Période analysée : {period || selectedYear?.toString() || ''}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                  {subtitle && (
                    <p className="text-muted-foreground mt-1">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Year Selector */}
              {selectedYear && onYearChange && availableYears.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const idx = availableYears.indexOf(selectedYear);
                      if (idx > 0) onYearChange(availableYears[idx - 1]);
                    }}
                    disabled={availableYears.indexOf(selectedYear) <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(v) => onYearChange(parseInt(v))}
                  >
                    <SelectTrigger className="w-[100px] h-8 text-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const idx = availableYears.indexOf(selectedYear);
                      if (idx < availableYears.length - 1) onYearChange(availableYears[idx + 1]);
                    }}
                    disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {onExport && (
                <Button 
                  size="sm"
                  onClick={onExport}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter le rapport
                </Button>
              )}
              <PlanBadge showUpgradeButton={true} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* Barre de fonctionnalités */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4 overflow-x-auto">
            {getDashboardFeatures().map((feature) => (
              <div
                key={feature.key}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                  feature.available
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
              >
                {feature.icon}
                <span>{feature.title}</span>
                {!feature.available && (
                  <span className="text-xs opacity-60">• Premium</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>

      {/* Section d'informations sur le plan (si pas expert) */}
      {userPlan.planType !== 'carbo_expert' && (
        <div className="border-t bg-muted/20 mt-8">
          <div className="container mx-auto px-4 py-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-600" />
                  Débloquez plus de fonctionnalités
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <PlanFeatureGuard feature="canAccessScope3" showUpgradePrompt={false}>
                    <div></div>
                  </PlanFeatureGuard>
                  
                  {!hasFeature('canAccessScope3') && (
                    <div className="text-center p-4 border rounded-lg">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-semibold mb-1">Scope 3</h3>
                      <p className="text-sm text-muted-foreground">
                        Analysez toutes vos émissions indirectes
                      </p>
                    </div>
                  )}
                  
                  {!hasFeature('canAccessAdvancedReports') && (
                    <div className="text-center p-4 border rounded-lg">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-semibold mb-1">Rapports avancés</h3>
                      <p className="text-sm text-muted-foreground">
                        Exportations et analyses personnalisées
                      </p>
                    </div>
                  )}
                  
                  {!hasFeature('canAccessMultiSites') && (
                    <div className="text-center p-4 border rounded-lg">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-semibold mb-1">Multi-sites</h3>
                      <p className="text-sm text-muted-foreground">
                        Consolidation de plusieurs sites
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};