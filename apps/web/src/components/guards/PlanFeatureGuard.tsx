import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, CreditCard, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlanAccess } from '@/shared/hooks/usePlanAccess';
import { useAuth } from '@/hooks/useAuth';

interface PlanFeatureGuardProps {
  children: React.ReactNode;
  feature: 'canAccessCBAM' | 'canAccessEconomicSimulation' | 'canAccessScope3' | 'canAccessAdvancedReports';
  featureName: string;
  description?: string;
  upgradeMessage?: string;
}

export const PlanFeatureGuard: React.FC<PlanFeatureGuardProps> = ({ 
  children, 
  feature,
  featureName,
  description,
  upgradeMessage
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userPlan, hasFeature, loading } = usePlanAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Vérification de votre plan...</span>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <Lock className="mx-auto h-16 w-16 text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Connexion Requise
        </h2>
        <p className="text-gray-600 mb-6">
          Vous devez vous connecter pour accéder à {featureName}.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            Se connecter
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="w-full"
          >
            Retour à l'accueil
          </Button>
        </div>
      </Card>
    );
  }

  // User doesn't have access to this feature
  if (!hasFeature(feature)) {
    const requiredPlans = feature === 'canAccessCBAM' ? ['complete', 'pro'] : ['pro'];
    
    return (
      <Card className="p-8 text-center max-w-2xl mx-auto">
        <CreditCard className="mx-auto h-16 w-16 text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Mise à Niveau Requise
        </h2>
        <p className="text-gray-600 mb-6">
          {upgradeMessage || `Pour accéder à ${featureName}, vous devez mettre à niveau votre plan.`}
        </p>
        
        {description && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-blue-800 text-sm">{description}</p>
          </div>
        )}

        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <div className="text-sm text-gray-600 mb-4">Votre plan actuel :</div>
          <div className="text-xl font-bold text-gray-900 mb-2">
            {userPlan.planName || 'Aucun plan'}
          </div>
          
          {requiredPlans.includes('complete') && (
            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded mb-4">
              <h4 className="font-semibold text-green-800 mb-2">Plan Complet - 2400 DT/an</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Accès au module CBAM</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Scope 3 inclus</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> 2 révisions/an</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Rapports avancés</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Support expert dédié</li>
              </ul>
            </div>
          )}

          {requiredPlans.includes('pro') && (
            <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded">
              <h4 className="font-semibold text-purple-800 mb-2">Plan Premium - Sur devis</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Tout du Plan Complet</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Bilans illimités</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Support dédié</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Formation incluse</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Multi-sites</li>
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/contact')}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Demander une mise à niveau
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/contact')}
            className="w-full"
          >
            Voir tous les plans
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="w-full"
          >
            Retour à l'accueil
          </Button>
        </div>
      </Card>
    );
  }

  // User has access - render children
  return <>{children}</>;
};