import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Download, MessageSquare, RotateCcw, 
  Factory, Zap, Truck, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { CBAMData, CBAMResults } from '@/types/cbam';
import { formatCurrency, formatEmissions } from '@/lib/cbamCalculations';

interface CBAMResultsStepProps {
  data: CBAMData;
  results: CBAMResults;
  onRestart: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export const CBAMResultsStep: React.FC<CBAMResultsStepProps> = ({
  data,
  results,
  onRestart
}) => {
  const { t } = useTranslation();

  // Prepare data for charts
  const emissionsBreakdownData = [
    { 
      name: t('cbamCalculator.results.breakdown.production'), 
      value: results.emissionsBySource.production,
      color: COLORS[0]
    },
    { 
      name: t('cbamCalculator.results.breakdown.energy'), 
      value: results.emissionsBySource.energy,
      color: COLORS[1]
    },
    { 
      name: t('cbamCalculator.results.breakdown.transport'), 
      value: results.emissionsBySource.transport,
      color: COLORS[2]
    }
  ];

  const comparisonData = [
    {
      name: t('cbamCalculator.results.comparison.realData'),
      emissions: results.comparisonWithDefaults.realData,
      cost: results.comparisonWithDefaults.realData * 85
    },
    {
      name: t('cbamCalculator.results.comparison.defaultData'),
      emissions: results.comparisonWithDefaults.defaultData,
      cost: results.comparisonWithDefaults.defaultData * 85
    }
  ];

  const savingsPercentage = ((results.comparisonWithDefaults.defaultData - results.comparisonWithDefaults.realData) / results.comparisonWithDefaults.defaultData) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('cbamCalculator.results.title')}
        </h2>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          ✅ Calcul terminé
        </Badge>
      </div>

      {/* Key Results Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              {t('cbamCalculator.results.totalEmissions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {formatEmissions(results.totalEmissions)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {formatEmissions(results.emissionsPerTonne)} par tonne
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              {t('cbamCalculator.results.cbamCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(results.cbamCost)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              à 85 €/tonne CO₂e
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Économies potentielles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(results.comparisonWithDefaults.savings)}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              vs. valeurs par défaut UE
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Emissions Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('cbamCalculator.results.breakdown.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={emissionsBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {emissionsBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatEmissions(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparison Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('cbamCalculator.results.comparison.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'emissions' ? formatEmissions(Number(value)) : formatCurrency(Number(value)), 
                    name === 'emissions' ? 'Émissions' : 'Coût CBAM'
                  ]}
                />
                <Bar dataKey="emissions" fill="#3B82F6" name="emissions" />
                <Bar dataKey="cost" fill="#10B981" name="cost" />
              </BarChart>
            </ResponsiveContainer>
            {savingsPercentage > 0 && (
              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <p className="text-green-800 text-sm font-medium">
                  💰 Vous économisez {savingsPercentage.toFixed(0)}% par rapport aux valeurs par défaut UE !
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            {t('cbamCalculator.results.recommendations.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-blue-900 text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-0">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Prochaines étapes recommandées
            </h3>
            <p className="text-gray-600 text-sm">
              Obtenez un accompagnement personnalisé pour optimiser votre empreinte carbone
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4" />
              {t('cbamCalculator.results.actions.downloadReport')}
            </Button>
            
            <Button variant="outline" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('cbamCalculator.results.actions.contactExperts')}
            </Button>
            
            <Button variant="outline" onClick={onRestart} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('cbamCalculator.results.actions.newCalculation')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-yellow-800 text-xs">
          ⚠️ <strong>Disclaimer:</strong> Ces résultats sont des estimations basées sur les données fournies et les facteurs d'émission disponibles. 
          Pour un calcul officiel CBAM, consultez les guidelines de la Commission Européenne et nos experts certifiés.
        </p>
      </div>
    </div>
  );
};