import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap } from 'lucide-react';
import { usePlanAccess, PlanFeatures } from '@/shared/hooks/usePlanAccess';
import { useNavigate } from 'react-router-dom';

interface PlanFeatureGuardProps {
  feature: keyof PlanFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  requiredPlan?: 'complete' | 'pro';
}

export const PlanFeatureGuard: React.FC<PlanFeatureGuardProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  requiredPlan = 'complete'
}) => {
  const { hasFeature, userPlan, canUpgrade } = usePlanAccess();
  const navigate = useNavigate();

  // Si l'utilisateur a accès à la fonctionnalité
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Si un fallback personnalisé est fourni
  if (fallback) {
    return <>{fallback}</>;
  }

  // Si on ne doit pas afficher le prompt d'upgrade
  if (!showUpgradePrompt) {
    return null;
  }

  // Messages selon la fonctionnalité
  const getFeatureInfo = () => {
    switch (feature) {
      case 'canAccessScope3':
        return {
          title: 'Analyse Scope 3',
          description: 'Analysez toutes vos émissions indirectes',
          icon: <Zap className="h-5 w-5" />
        };
      case 'canAccessAdvancedReports':
        return {
          title: 'Rapports avancés',
          description: 'Accédez aux analyses détaillées et exportations personnalisées',
          icon: <Crown className="h-5 w-5" />
        };
      case 'canAccessExpertSupport':
        return {
          title: 'Support expert',
          description: 'Bénéficiez d\'un accompagnement personnalisé',
          icon: <Crown className="h-5 w-5" />
        };
      case 'canAccessTraining':
        return {
          title: 'Formation incluse',
          description: 'Formations carbone pour vos équipes',
          icon: <Crown className="h-5 w-5" />
        };
      case 'canAccessMultiSites':
        return {
          title: 'Multi-sites',
          description: 'Gérez plusieurs sites et consolidez vos données',
          icon: <Crown className="h-5 w-5" />
        };
      case 'hasNetZeroPlanning':
        return {
          title: 'Trajectoire Net Zero',
          description: 'Planifiez votre stratégie de décarbonation sur 10 ans',
          icon: <Zap className="h-5 w-5" />
        };
      default:
        return {
          title: 'Fonctionnalité premium',
          description: 'Cette fonctionnalité nécessite un plan supérieur',
          icon: <Lock className="h-5 w-5" />
        };
    }
  };

  const featureInfo = getFeatureInfo();
  const planName = requiredPlan === 'pro' ? 'CarboPro' : 'Plan Complet';

  return (
    <Card className="border-2 border-dashed border-muted-foreground/30">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {featureInfo.icon}
        </div>
        <CardTitle className="text-lg">{featureInfo.title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {featureInfo.description}
        </p>
        
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs">
            Plan actuel: {userPlan.planName}
          </Badge>
          <Badge variant="default" className="text-xs">
            Requis: {planName}
          </Badge>
        </div>

        {canUpgrade() && (
          <div className="space-y-2">
            <Button
              onClick={() => navigate(`/payment?plan=${requiredPlan}`)}
              className="w-full"
              size="sm"
            >
              <Crown className="h-4 w-4 mr-2" />
              Passer au {planName}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="w-full"
              size="sm"
            >
              Comparer les plans
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};