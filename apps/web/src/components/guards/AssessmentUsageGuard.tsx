import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAssessmentUsage } from '@/hooks/useAssessmentUsage';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface AssessmentUsageGuardProps {
  children: React.ReactNode;
  showUsageInfo?: boolean;
}

export const AssessmentUsageGuard: React.FC<AssessmentUsageGuardProps> = ({ 
  children, 
  showUsageInfo = false 
}) => {
  const navigate = useNavigate();
  const { usage, loading: usageLoading, canCreateAssessment } = useAssessmentUsage();
  const { hasActiveSubscription, loading: subLoading } = useSubscriptionStatus();


  if (usageLoading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Vérification de votre abonnement...</span>
      </div>
    );
  }

  // No active subscription
  if (!hasActiveSubscription) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <CreditCard className="mx-auto h-16 w-16 text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Abonnement Requis
        </h2>
        <p className="text-gray-600 mb-6">
          Pour accéder au bilan carbone personnalisé, vous devez souscrire à notre plan CarboScan.
        </p>
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <div className="text-2xl font-bold text-green-600">2500 DT/an</div>
          <div className="text-sm text-green-700">
            ✅ 3 bilans carbone par an<br/>
            ✅ Rapports détaillés<br/>
            ✅ Support email<br/>
            ✅ Recommandations personnalisées
          </div>
        </div>
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/payment')}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            S'abonner maintenant
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

  // Usage limit reached
  if (!canCreateAssessment && usage) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Limite Atteinte
        </h2>
        <p className="text-gray-600 mb-6">
          Vous avez utilisé vos 3 évaluations carbone incluses dans votre abonnement CarboStart (2500 DT/an).
        </p>
        
        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <div className="text-red-700 font-semibold mb-2">Votre utilisation :</div>
          <div className="text-2xl font-bold text-red-600">
            {usage.assessments_used} / {usage.assessments_limit}
          </div>
          <div className="text-sm text-red-600">bilans carbone utilisés</div>
        </div>

        <div className="text-sm text-gray-600 mb-6">
          <p>Options disponibles :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Attendre le renouvellement automatique de votre abonnement (31 décembre)</li>
            <li>Contacter notre support pour souscrire à un plan supérieur</li>
            <li>Consulter vos bilans carbone existants dans votre tableau de bord</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/contact')}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Contacter le Support
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/carbo-start/dashboard')}
            className="w-full"
          >
            Consulter mes bilans (lecture seule)
          </Button>
        </div>
      </Card>
    );
  }

  // Show usage info component if requested
  if (showUsageInfo && usage) {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">
                  Abonnement Actif
                </div>
                <div className="text-sm text-green-700">
                  {usage.assessments_remaining} évaluation(s) restante(s)
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {usage.assessments_used} / {usage.assessments_limit}
              </div>
              <div className="text-xs text-green-600">utilisées</div>
            </div>
          </div>
        </Card>
        {children}
      </div>
    );
  }

  // User can create assessment - render children
  return <>{children}</>;
}; 