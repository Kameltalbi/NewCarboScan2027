// Dialog pour choisir la méthode de création d'un nouveau bilan

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Database, Zap, Shield, ArrowRight } from 'lucide-react';

interface NewBilanMethodDialogProps {
  onClose?: () => void;
}

export const NewBilanMethodDialog: React.FC<NewBilanMethodDialogProps> = ({ onClose }) => {
  const navigate = useNavigate();

  const handleQuestionnaireClick = () => {
    navigate('/app/bilan-carbone/questionnaire');
    onClose?.();
  };

  const handleCollectClick = () => {
    navigate('/app/collecte?mode=bilan-carbone');
    onClose?.();
  };

  const handleSourcesClick = () => {
    navigate('/app/collecte/sources');
    onClose?.();
  };

  return (
    <div className="space-y-4">
      {/* Option 1 : Questionnaire */}
      <Card className="border-2 hover:border-blue-500 transition-colors cursor-pointer" onClick={handleQuestionnaireClick}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg shrink-0">
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
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
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                <span className="whitespace-nowrap">⏱️ ~15 min</span>
                <span className="whitespace-nowrap">📊 Estimation indicative</span>
                <span className="whitespace-nowrap">🎯 Premier diagnostic</span>
              </div>

              <Button 
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuestionnaireClick();
                }}
              >
                Démarrer le questionnaire
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Option 2 : Data Collection */}
      <Card className="border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={handleCollectClick}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-lg shrink-0">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
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
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                <span className="whitespace-nowrap">📋 14 postes GHG Protocol</span>
                <span className="whitespace-nowrap">✅ Audit-ready</span>
                <span className="whitespace-nowrap">🏆 Certification</span>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCollectClick();
                  }}
                >
                  Commencer la collecte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSourcesClick();
                  }}
                >
                  Voir les sources
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message informatif */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>💡 Conseil :</strong> Commencez par le questionnaire pour une première estimation, 
          puis passez à la collecte détaillée pour obtenir un bilan audit-ready.
        </p>
      </div>
    </div>
  );
};
