/**
 * CBAM Result Component
 * Displays calculated emissions breakdown
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Zap, Package, Truck, Cog } from 'lucide-react';
import type { CBAMCalculationResult } from './types';

interface CBAMResultProps {
  result: CBAMCalculationResult;
  productName?: string;
}

export const CBAMResult: React.FC<CBAMResultProps> = ({ result, productName }) => {
  const formatNumber = (num: number): string => {
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getPercentage = (value: number): number => {
    return result.total > 0 ? (value / result.total) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Résultats du Calcul CBAM
            {productName && (
              <Badge variant="outline" className="ml-auto">
                {productName}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-600">Énergie</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(result.energyEm)} tCO₂e
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getPercentage(result.energyEm).toFixed(1)}% du total
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Matériaux</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(result.materialsEm)} tCO₂e
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getPercentage(result.materialsEm).toFixed(1)}% du total
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Transport</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(result.transportEm)} tCO₂e
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getPercentage(result.transportEm).toFixed(1)}% du total
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Cog className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Processus</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(result.processEm)} tCO₂e
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getPercentage(result.processEm).toFixed(1)}% du total
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="bg-blue-100 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Total des Émissions</span>
              <span className="text-3xl font-bold text-blue-700">
                {formatNumber(result.total)} tCO₂e
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Energy Breakdown */}
        {result.breakdown.energy.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Détail Énergie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.breakdown.energy.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.type}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity.toLocaleString('fr-FR')} {item.type === 'electricity' ? 'kWh' : item.type === 'gas' ? 'm³' : 'L'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatNumber(item.emissions)} tCO₂e
                      </p>
                      <p className="text-xs text-gray-500">FE: {item.FE.toFixed(3)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Materials Breakdown */}
        {result.breakdown.materials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Détail Matériaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.breakdown.materials.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.type}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity.toLocaleString('fr-FR')} tonnes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatNumber(item.emissions)} tCO₂e
                      </p>
                      <p className="text-xs text-gray-500">FE: {item.FE.toFixed(3)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transport Breakdown */}
        {result.breakdown.transport.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                Détail Transport
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.breakdown.transport.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.mode}</p>
                      <p className="text-sm text-gray-600">
                        {item.distance.toLocaleString('fr-FR')} km × {item.tonnage.toLocaleString('fr-FR')} t
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatNumber(item.emissions)} tCO₂e
                      </p>
                      <p className="text-xs text-gray-500">FE: {item.FE.toFixed(3)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Process Breakdown */}
        {result.breakdown.process.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5 text-purple-600" />
                Détail Processus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.breakdown.process.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.value.toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatNumber(item.emissions)} tCO₂e
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};




