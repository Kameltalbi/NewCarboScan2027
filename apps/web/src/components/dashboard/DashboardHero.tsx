import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Building2, Target, TrendingUp } from 'lucide-react';

interface DashboardHeroProps {
  displayName: string;
  organizationInfo: string;
  hasActiveSubscription: boolean;
  totalEmissions: number;
  annualGoal?: number;
  progress?: number;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  displayName,
  organizationInfo,
  hasActiveSubscription,
  totalEmissions,
  annualGoal = 250,
  progress = 65
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const reductionTarget = annualGoal * 0.15; // 15% reduction target
  const currentProgress = Math.min((reductionTarget / totalEmissions) * 100, 100);

  return (
    <Card className="dashboard-hero mb-8">
      <CardContent className="p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          
          {/* Left Section - User & Company Info */}
          <div className="flex items-start gap-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                Tableau de bord
              </h1>
              <p className="text-xl font-semibold text-dashboard-hero-accent mb-1">
                Bienvenue {displayName}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Building2 className="h-4 w-4" />
                <span>{organizationInfo}</span>
              </div>
              
              {/* Subscription Status */}
              <div className="flex items-center gap-4">
                {hasActiveSubscription ? (
                  <Badge variant="outline" className="border-kpi-positive text-kpi-positive">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    CarboStart Actif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-kpi-warning text-kpi-warning">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Abonnement Inactif
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Goals & Progress */}
          <div className="lg:min-w-[320px]">
            <div className="space-y-6">
              
              {/* Carbon Goal Progress */}
              <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Objectif 2024</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Réduction carbone</span>
                    <span className="font-medium text-foreground">{Math.round(currentProgress)}% atteint</span>
                  </div>
                  
                  <Progress value={currentProgress} className="h-3" />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(totalEmissions / 1000).toLocaleString('fr-FR')} tCO₂e actuel</span>
                    <span>{Math.round(reductionTarget / 1000).toLocaleString('fr-FR')} tCO₂e cible</span>
                  </div>
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="bg-card/50 rounded-lg p-6 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-kpi-positive" />
                  <h3 className="font-semibold text-foreground">Performance</h3>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-kpi-positive mb-1">
                    Excellente
                  </div>
                  <p className="text-xs text-muted-foreground">
                    15% sous la moyenne sectorielle
                  </p>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};