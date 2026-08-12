import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function ACVInterpretation() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  // Données d'exemple - à remplacer par les vraies données du projet
  const interpretationData = {
    majorContributors: [
      { category: 'Ciment', percentage: 72, impact: 'CO2e' },
      { category: 'Transport', percentage: 18, impact: 'CO2e' },
      { category: 'Électricité', percentage: 10, impact: 'CO2e' },
    ],
    recommendations: [
      {
        title: 'Optimiser la composition du ciment',
        description: 'Utiliser du ciment avec un taux de clinker réduit ou des ajouts cimentaires (laitier, cendres volantes)',
        priority: 'high',
        reduction: 'À quantifier via le moteur (pas de % inventé)'
      },
      {
        title: 'Optimiser le transport',
        description: 'Privilégier les fournisseurs locaux et optimiser les distances de transport',
        priority: 'medium',
        reduction: 'À quantifier via le moteur'
      },
      {
        title: 'Énergie renouvelable',
        description: 'Transition vers des sources d\'énergie renouvelables pour les processus de production',
        priority: 'medium',
        reduction: 'À quantifier via le moteur'
      }
    ],
    limitations: [
      'Utilisation de facteurs d\'émission génériques (ADEME)',
      'Données de transport estimées',
      'Processus de fin de vie simplifiés'
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/acv/projet/${projectId}/resultats`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux résultats
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interprétation des résultats
          </h1>
          <p className="text-gray-600">
            Analyse des contributions et recommandations d'amélioration (Étape 4 - ISO 14040)
          </p>
        </div>

        <div className="grid gap-8">
          {/* Contributions principales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Postes les plus contributeurs
              </CardTitle>
              <CardDescription>
                Analyse des impacts par catégorie pour le changement climatique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interpretationData.majorContributors.map((contributor, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{contributor.category}</span>
                      <span className="text-sm font-semibold">{contributor.percentage}%</span>
                    </div>
                    <Progress value={contributor.percentage} className="h-2" />
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Analyse:</strong> Le ciment représente 72% des émissions totales, 
                  ce qui en fait le levier d'amélioration prioritaire pour réduire l'impact environnemental.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recommandations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                Recommandations d'amélioration
              </CardTitle>
              <CardDescription>
                Pistes d'action pour réduire l'impact environnemental
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {interpretationData.recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{rec.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rec.priority === 'high' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {rec.priority === 'high' ? 'Priorité haute' : 'Priorité moyenne'}
                        </span>
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                          Réduction: {rec.reduction}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600">{rec.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Limites et hypothèses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Limites et hypothèses
              </CardTitle>
              <CardDescription>
                Points d'attention pour l'interprétation des résultats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {interpretationData.limitations.map((limitation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span className="text-gray-700">{limitation}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-700">
                  <strong>Important:</strong> Ces résultats sont basés sur des données génériques. 
                  Pour une analyse plus précise, il est recommandé d'utiliser des données spécifiques 
                  à votre processus de production.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline"
            onClick={() => navigate(`/acv/projet/${projectId}/resultats`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Étape précédente
          </Button>
          <Button 
            onClick={() => navigate(`/acv/projet/${projectId}/comparaison`)}
            className="bg-primary hover:bg-primary/90"
          >
            Comparaison (optionnel)
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}