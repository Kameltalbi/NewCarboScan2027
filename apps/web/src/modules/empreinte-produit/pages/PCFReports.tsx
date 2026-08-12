// Page Rapports globale – Liste de tous les rapports PCF générés
import React from 'react';
import { usePCFStudies } from '../hooks/usePCFStudy';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PCFReports: React.FC = () => {
  const { data: studies, isLoading } = usePCFStudies();
  const navigate = useNavigate();

  const calculatedStudies = studies?.filter(s => s.status === 'calculated' || s.status === 'locked') || [];

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rapports PCF</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consultez et générez les rapports d'empreinte carbone produit pour vos études calculées.
        </p>
      </div>

      {calculatedStudies.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune étude calculée.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Calculez d'abord l'empreinte d'un produit dans une étude pour générer un rapport.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {calculatedStudies.map(study => (
            <Card key={study.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{study.name}</p>
                    <Badge variant={study.status === 'locked' ? 'default' : 'secondary'} className="text-[10px]">
                      {study.status === 'locked' ? '🔒 Verrouillé' : 'Calculé'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{study.product_category}</span>
                    <span>·</span>
                    <span>{(study.total_emissions || 0).toFixed(2)} kg CO₂e / {study.functional_unit}</span>
                    <span>·</span>
                    <span>v{study.version}</span>
                    <span>·</span>
                    <span>{format(new Date(study.updated_at), 'dd MMM yyyy', { locale: fr })}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline" size="sm" className="gap-1.5"
                onClick={() => navigate(`/app/empreinte-produit/etude/${study.id}/rapport`)}
              >
                Voir le rapport <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PCFReports;
