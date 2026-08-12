import React from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useAppData } from '@/contexts/AppDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Building2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface SubscriptionStatusGuardProps {
  children: React.ReactNode;
}

export const SubscriptionStatusGuard: React.FC<SubscriptionStatusGuardProps> = ({ children }) => {
  const { hasActiveSubscription, orders, loading, error, refreshStatus } = useSubscriptionStatus();
  const { isSuperAdmin, roleLoading } = useAppData();

  if (loading || roleLoading) {
    return (
      <div className="flex-1 p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Vérification de votre abonnement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refreshStatus} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si l'utilisateur est superadmin ou a un abonnement actif, afficher le contenu
  if (isSuperAdmin || hasActiveSubscription) {
    return <>{children}</>;
  }

  // Sinon, afficher l'état d'attente de validation
  const pendingOrder = orders.find(order => order.status === 'pending');
  const rejectedOrder = orders.find(order => order.status === 'rejected');

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900 mb-2">
              Compte en attente de validation
            </CardTitle>
            <p className="text-gray-600">
              Votre compte CarboScan est en cours de validation par notre équipe
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Statut de la commande */}
            {pendingOrder && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">Commande en attente</h3>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    En attente
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Méthode de paiement :</p>
                    <p className="font-medium">{pendingOrder.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Montant :</p>
                    <p className="font-medium">{pendingOrder.amount} {pendingOrder.currency}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Date de commande :</p>
                    <p className="font-medium">
                      {new Date(pendingOrder.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Plan :</p>
                    <p className="font-medium">CarboScan</p>
                  </div>
                </div>
              </div>
            )}

            {rejectedOrder && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Commande rejetée</h3>
                  <Badge variant="destructive">
                    Rejetée
                  </Badge>
                </div>
                <p className="text-sm text-red-700">
                  Votre dernière commande a été rejetée. 
                  Veuillez contacter notre équipe pour plus d'informations.
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Prochaines étapes :</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Votre commande a été enregistrée avec succès</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Notre équipe vérifie la réception de votre paiement</span>
                </li>
                <li className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Vous recevrez un email de confirmation dès l'activation</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={refreshStatus} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Vérifier le statut
              </Button>
              
              {!pendingOrder && (
                <Link to="/payment" className="flex-1">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Nouvelle commande
                  </Button>
                </Link>
              )}
              
              <Link to="/contact" className="flex-1">
                <Button variant="outline" className="w-full">
                  Contacter le support
                </Button>
              </Link>
            </div>

            {/* Délai d'activation */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              <p>Délai habituel de validation : 24-48 heures ouvrables</p>
              <p>Pour les paiements par virement : 2-5 jours ouvrables</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};