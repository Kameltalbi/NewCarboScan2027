// Composant pour convertir des unités dans le flux de collecte

import React, { useState } from 'react';
import { UnitConversionService, ConversionResult } from '@/lib/activity-data/UnitConversionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UnitConverterProps {
  initialValue?: number;
  initialUnit?: string;
  targetUnit?: string;
  category?: string;
  onConvert?: (result: ConversionResult) => void;
}

export const UnitConverter: React.FC<UnitConverterProps> = ({
  initialValue,
  initialUnit,
  targetUnit,
  category,
  onConvert,
}) => {
  const { toast } = useToast();
  const [value, setValue] = useState<number>(initialValue || 0);
  const [fromUnit, setFromUnit] = useState<string>(initialUnit || '');
  const [toUnit, setToUnit] = useState<string>(targetUnit || '');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [availableConversions, setAvailableConversions] = useState<string[]>([]);

  React.useEffect(() => {
    if (fromUnit) {
      const conversions = UnitConversionService.getAvailableConversions(fromUnit, category);
      setAvailableConversions(conversions.map(c => c.to));
    }
  }, [fromUnit, category]);

  const handleConvert = () => {
    if (!value || !fromUnit || !toUnit) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir la valeur et les unités',
        variant: 'destructive',
      });
      return;
    }

    const conversion = UnitConversionService.convert(value, fromUnit, toUnit, category);
    
    if (!conversion) {
      toast({
        title: 'Conversion impossible',
        description: `Aucune conversion trouvée de ${fromUnit} vers ${toUnit}`,
        variant: 'destructive',
      });
      setResult(null);
      return;
    }

    setResult(conversion);
    
    if (onConvert) {
      onConvert(conversion);
    }

    toast({
      title: 'Conversion réussie',
      description: `${value} ${fromUnit} = ${conversion.value.toFixed(2)} ${toUnit}`,
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      exact: 'default',
      approximate: 'secondary',
      estimated: 'outline',
    };
    const labels: Record<string, string> = {
      exact: 'Exact',
      approximate: 'Approximatif',
      estimated: 'Estimé',
    };
    return (
      <Badge variant={variants[confidence] || 'outline'}>
        {labels[confidence] || confidence}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Convertisseur d'unités
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="value">Valeur</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from_unit">De</Label>
            <Input
              id="from_unit"
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              placeholder="kWh"
            />
            {availableConversions.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Conversions possibles: {availableConversions.slice(0, 3).join(', ')}
                {availableConversions.length > 3 && ` +${availableConversions.length - 3}`}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="to_unit">Vers</Label>
            <Input
              id="to_unit"
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              placeholder="MWh"
            />
          </div>
        </div>

        <Button onClick={handleConvert} className="w-full">
          <ArrowRight className="w-4 h-4 mr-2" />
          Convertir
        </Button>

        {result && (
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-semibold">Résultat</span>
              </div>
              {getConfidenceBadge(result.confidence)}
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {result.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {result.unit}
              </div>
              <div className="text-sm text-muted-foreground">
                = {result.original_value.toLocaleString('fr-FR')} {result.original_unit}
                {result.factor !== 1 && (
                  <span className="ml-2">(× {result.factor.toLocaleString('fr-FR', { maximumFractionDigits: 4 })})</span>
                )}
              </div>
              {result.confidence !== 'exact' && (
                <div className="flex items-center gap-2 text-xs text-amber-600 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {result.confidence === 'approximate' 
                      ? 'Cette conversion est approximative. Vérifiez la valeur selon votre contexte.'
                      : 'Cette conversion est estimée. Utilisez-la avec précaution.'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversions courantes */}
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium mb-2 block">Conversions courantes</Label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-muted rounded">
              <div className="font-medium">Énergie</div>
              <div className="text-muted-foreground">kWh ↔ MWh ↔ GWh</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="font-medium">Gaz</div>
              <div className="text-muted-foreground">m³ → kWh</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="font-medium">Carburants</div>
              <div className="text-muted-foreground">L → kWh</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="font-medium">Masse</div>
              <div className="text-muted-foreground">kg ↔ tonnes</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
