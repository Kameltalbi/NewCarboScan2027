import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Edit2, Download, BarChart3 } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ExcelJS from 'exceljs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Recommendation {
  id: string;
  titre: string;
  description: string;
  scope_cible: string;
  seuil_emission_kgco2e: number;
  categorie: string;
  impact_estime_pourcent: string;
  priorite: string;
  status?: 'pending' | 'accepted' | 'modified' | 'rejected';
  modifiedAction?: string;
}

interface EmissionResult {
  scope1: number;
  scope2: number;
  scope3?: number;
  details?: {
    [key: string]: number;
  };
}

interface RecommendationsModuleProps {
  emissionsResult: EmissionResult;
  bilanId?: string;
}

export const RecommendationsModule: React.FC<RecommendationsModuleProps> = ({
  emissionsResult,
  bilanId
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actionPlans, setActionPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, [emissionsResult]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      // Fetch all recommendations from database
      const { data: allRecommendations, error } = await supabase
        .from('actions_recommandees')
        .select('*')
        .order('titre');

      if (error) throw error;

      // Filter recommendations based on emission thresholds
      const applicableRecommendations = allRecommendations?.filter(rec => {
        const emissionValue = getEmissionValueForScope(rec.scope_cible);
        return emissionValue >= (rec.seuil_emission_kgco2e / 1000); // Convert kg to tonnes
      }) || [];

      setRecommendations(applicableRecommendations.map(rec => ({ ...rec, status: 'pending' })));
      
    } catch (error) {
      console.error('Erreur lors du chargement des recommandations:', error);
      toast.error('Erreur lors du chargement des recommandations');
    } finally {
      setLoading(false);
    }
  };

  const getEmissionValueForScope = (scope: string): number => {
    if (scope === '1') return emissionsResult.scope1;
    if (scope === '2') return emissionsResult.scope2;
    if (scope === '3') return emissionsResult.scope3 || 0;
    if (scope === 'tous') return emissionsResult.scope1 + emissionsResult.scope2 + (emissionsResult.scope3 || 0);
    return 0;
  };

  const handleAccept = async (recommendation: Recommendation) => {
    try {
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendation.id 
            ? { ...rec, status: 'accepted' }
            : rec
        )
      );

      toast.success('Recommandation ajoutée au plan d\'actions');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'ajout au plan d\'actions');
    }
  };

  const handleReject = (recommendationId: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === recommendationId 
          ? { ...rec, status: 'rejected' }
          : rec
      )
    );
    toast.success('Recommandation rejetée');
  };

  const handleEdit = (recommendation: Recommendation) => {
    setEditingId(recommendation.id);
    setEditText(recommendation.modifiedAction || recommendation.description);
  };

  const handleSaveEdit = (recommendationId: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === recommendationId 
          ? { ...rec, modifiedAction: editText, status: 'modified' }
          : rec
      )
    );
    setEditingId(null);
    setEditText('');
    toast.success('Recommandation modifiée');
  };

  const exportToExcel = async () => {
    const acceptedRecommendations = recommendations.filter(rec => 
      rec.status === 'accepted' || rec.status === 'modified'
    );

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Plan d\'Actions');

      worksheet.columns = [
        { header: 'Action', key: 'action', width: 30 },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Catégorie', key: 'categorie', width: 20 },
        { header: 'Scope cible', key: 'scope_cible', width: 15 },
        { header: 'Priorité', key: 'priorite', width: 15 },
        { header: 'Impact estimatif', key: 'impact_estime_pourcent', width: 15 }
      ];

      const worksheetData = acceptedRecommendations.map(rec => ({
        action: rec.titre,
        description: rec.modifiedAction || rec.description,
        categorie: rec.categorie,
        scope_cible: rec.scope_cible,
        priorite: rec.priorite,
        impact_estime_pourcent: rec.impact_estime_pourcent
      }));

      worksheet.addRows(worksheetData);

      // Générer et télécharger le fichier
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plan-actions-carbone.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Plan d\'actions exporté en Excel');
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const getPotentialImpact = () => {
    return recommendations
      .filter(rec => rec.status === 'accepted' || rec.status === 'modified')
      .reduce((total, rec) => {
        // Extract percentage from impact_estime_pourcent (e.g., "10-15%" -> 15)
        const match = rec.impact_estime_pourcent.match(/(\d+)-?(\d+)?%/);
        const percentage = match ? parseInt(match[2] || match[1]) : 0;
        const currentEmissions = getEmissionValueForScope(rec.scope_cible);
        return total + (currentEmissions * percentage / 100);
      }, 0);
  };

  const getChartData = () => {
    const acceptedRecommendations = recommendations.filter(rec => 
      rec.status === 'accepted' || rec.status === 'modified'
    );

    return {
      labels: acceptedRecommendations.map(rec => rec.titre),
      datasets: [
        {
          label: 'Réduction potentielle (tCO₂e)',
          data: acceptedRecommendations.map(rec => {
            const match = rec.impact_estime_pourcent.match(/(\d+)-?(\d+)?%/);
            const percentage = match ? parseInt(match[2] || match[1]) : 0;
            const currentEmissions = getEmissionValueForScope(rec.scope_cible);
            return currentEmissions * percentage / 100;
          }),
          backgroundColor: 'hsl(var(--primary) / 0.8)',
          borderColor: 'hsl(var(--primary))',
          borderWidth: 1,
        },
      ],
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recommandations automatiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const acceptedRecommendations = recommendations.filter(rec => 
    rec.status === 'accepted' || rec.status === 'modified'
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recommandations automatiques
          </CardTitle>
          {acceptedRecommendations.length > 0 && (
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter Excel
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune recommandation disponible pour votre profil d'émissions
            </p>
          ) : (
            <div className="space-y-4">
              {recommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    recommendation.status === 'accepted' ? 'border-green-200 bg-green-50' :
                    recommendation.status === 'rejected' ? 'border-red-200 bg-red-50' :
                    recommendation.status === 'modified' ? 'border-blue-200 bg-blue-50' :
                    'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{recommendation.titre}</h4>
                        <Badge variant="secondary">{recommendation.categorie}</Badge>
                        <Badge variant="outline">
                          Scope {recommendation.scope_cible}
                        </Badge>
                        <Badge variant="outline">
                          -{recommendation.impact_estime_pourcent}
                        </Badge>
                        <Badge 
                          variant={recommendation.priorite === 'haute' ? 'destructive' : 
                                 recommendation.priorite === 'moyenne' ? 'default' : 'secondary'}
                        >
                          {recommendation.priorite}
                        </Badge>
                      </div>
                      
                      {editingId === recommendation.id ? (
                        <div className="space-y-2">
                          <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[80px]"
                          placeholder={recommendation.description}
                        />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(recommendation.id)}>
                              Sauvegarder
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {recommendation.modifiedAction || recommendation.description}
                        </p>
                      )}
                    </div>
                    
                    {recommendation.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAccept(recommendation)}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(recommendation)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(recommendation.id)}
                          className="h-8 w-8 p-0"
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impact Chart */}
      {acceptedRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Impact potentiel des actions validées</CardTitle>
            <p className="text-sm text-muted-foreground">
              Réduction totale estimée: <strong>{getPotentialImpact()} tCO₂e</strong>
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar
                data={getChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'tCO₂e évités'
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};