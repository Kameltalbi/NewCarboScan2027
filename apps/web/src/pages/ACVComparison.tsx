import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Copy, Plus, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ACVComparison() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [selectedScenario, setSelectedScenario] = useState<string>('');

  // Données d'exemple - à remplacer par les vraies données
  const scenarios = [
    {
      id: '1',
      name: 'Scénario de base',
      description: 'Configuration actuelle',
      results: {
        climate: 850,
        acidification: 2.3,
        water: 145
      }
    },
    {
      id: '2', 
      name: 'Ciment bas carbone',
      description: 'Utilisation de ciment avec 30% de laitier',
      results: {
        climate: 620,
        acidification: 2.1,
        water: 140
      }
    }
  ];

  const createNewScenario = () => {
    // Logique pour dupliquer le projet et créer un nouveau scénario
    // TODO: dupliquer le projet et créer un nouveau scénario
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/acv/projet/${projectId}/interpretation`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'interprétation
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Comparaison de scénarios
          </h1>
          <p className="text-gray-600">
            Comparez différentes configurations pour identifier les meilleures options
          </p>
        </div>

        <div className="grid gap-8">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Copy className="w-5 h-5 mr-2" />
                Gestion des scénarios
              </CardTitle>
              <CardDescription>
                Créez et comparez différents scénarios d'amélioration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button onClick={createNewScenario} className="flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un nouveau scénario
                </Button>
                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Sélectionner un scénario à comparer" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tableau de comparaison */}
          {scenarios.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Comparaison des impacts
                </CardTitle>
                <CardDescription>
                  Résultats côte à côte des différents scénarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Impact</th>
                        {scenarios.map((scenario) => (
                          <th key={scenario.id} className="text-center py-3 px-4 font-semibold">
                            {scenario.name}
                          </th>
                        ))}
                        <th className="text-center py-3 px-4 font-semibold text-green-600">
                          Amélioration
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Changement climatique (kg CO₂e)</td>
                        {scenarios.map((scenario) => (
                          <td key={scenario.id} className="text-center py-3 px-4">
                            {scenario.results.climate.toLocaleString()}
                          </td>
                        ))}
                        <td className="text-center py-3 px-4 font-semibold text-green-600">
                          -27% (-230 kg CO₂e)
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Acidification (kg SO₂e)</td>
                        {scenarios.map((scenario) => (
                          <td key={scenario.id} className="text-center py-3 px-4">
                            {scenario.results.acidification}
                          </td>
                        ))}
                        <td className="text-center py-3 px-4 font-semibold text-green-600">
                          -9% (-0,2 kg SO₂e)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">Consommation d'eau (L)</td>
                        {scenarios.map((scenario) => (
                          <td key={scenario.id} className="text-center py-3 px-4">
                            {scenario.results.water.toLocaleString()}
                          </td>
                        ))}
                        <td className="text-center py-3 px-4 font-semibold text-green-600">
                          -3% (-5 L)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    <strong>Conclusion:</strong> L'utilisation de ciment bas carbone permet une réduction 
                    significative de 27% des émissions de CO₂e, ce qui représente l'option la plus efficace 
                    pour diminuer l'impact climatique.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions si pas de scénarios */}
          {scenarios.length <= 1 && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="max-w-sm mx-auto">
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Aucune comparaison disponible
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Créez un nouveau scénario pour comparer différentes configurations 
                    et identifier les meilleures options d'amélioration.
                  </p>
                  <Button onClick={createNewScenario}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un scénario
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline"
            onClick={() => navigate(`/acv/projet/${projectId}/interpretation`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Étape précédente
          </Button>
          <Button 
            onClick={() => navigate(`/acv/projet/${projectId}/export`)}
            className="bg-primary hover:bg-primary/90"
          >
            Export du rapport
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}