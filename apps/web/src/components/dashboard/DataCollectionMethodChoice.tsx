// Composant : Choix de la méthode de collecte (Questionnaire vs Data Collection)

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Database, Zap, Shield, ArrowRight } from 'lucide-react';

export const DataCollectionMethodChoice = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Commencez votre Bilan Carbone
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choisissez votre méthode de collecte selon vos besoins
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Option 1 : Questionnaire */}
        <div className="border rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-base">
                  Questionnaire guidé
                </h3>
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Rapide
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                Obtenez une première estimation en 15-20 minutes. 
                Idéal pour découvrir vos principaux postes d'émissions.
              </p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span>⏱️ ~15 min</span>
                <span>📊 Estimation indicative</span>
                <span>🎯 Premier diagnostic</span>
              </div>

              <Button 
                variant="outline"
                className="w-full"
                onClick={() => navigate('/app/bilan-carbone/questionnaire')}
              >
                Démarrer le questionnaire
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Option 2 : Data Collection */}
        <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-base">
                  Collecte de données détaillée
                </h3>
                <Badge variant="default" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Audit-ready
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Recommandé
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                Collectez vos données réelles (factures, carnets, comptabilité) 
                pour un bilan carbone certifiable par un organisme tiers.
              </p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span>📋 14 postes GHG Protocol</span>
                <span>✅ Audit-ready</span>
                <span>🏆 Certification</span>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={() => navigate('/app/collecte?mode=bilan-carbone')}
                >
                  Commencer la collecte détaillée
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/app/collecte/sources')}
                >
                  Voir les sources de données
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Message informatif */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>💡 Conseil :</strong> Commencez par le questionnaire pour une première estimation, 
            puis passez à la collecte détaillée pour obtenir un bilan audit-ready.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
