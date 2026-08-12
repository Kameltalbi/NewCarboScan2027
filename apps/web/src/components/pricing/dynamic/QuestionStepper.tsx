import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { defaultModules, getEntityUnitPrice, calculateEntityPrice } from './PricingCalculator';

export interface PricingFormData {
  employees: number;
  revenue: number; // in KTND
  sites: number;
  entities: number;
  hasScope3: boolean;
  sector: string;
  selectedModules: string[];
  academyUsers: number;
}

interface QuestionStepperProps {
  currentStep: number;
  formData: PricingFormData;
  onFormDataChange: (data: Partial<PricingFormData>) => void;
  isEnterprise: boolean;
}

const sectors = [
  { value: 'industrie', label: 'Industrie' },
  { value: 'services', label: 'Services' },
  { value: 'tech', label: 'Tech' },
  { value: 'public', label: 'Public' }
];

export const QuestionStepper: React.FC<QuestionStepperProps> = ({
  currentStep,
  formData,
  onFormDataChange,
  isEnterprise
}) => {
  const handleChange = (field: keyof PricingFormData, value: any) => {
    onFormDataChange({ [field]: value });
  };

  const handleModuleToggle = (moduleId: string) => {
    const currentModules = formData.selectedModules || [];
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(id => id !== moduleId)
      : [...currentModules, moduleId];
    handleChange('selectedModules', newModules);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label htmlFor="employees" className="text-lg font-semibold">
                  Combien de salariés avez-vous ?
                </Label>
                <Input
                  id="employees"
                  type="number"
                  min="1"
                  value={formData.employees || ''}
                  onChange={(e) => handleChange('employees', parseInt(e.target.value) || 0)}
                  placeholder="Ex: 150"
                  className="text-lg"
                />
                {formData.employees > 250 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                    <span className="text-sm text-blue-700 font-medium">
                      Profil Entreprise – Accompagnement personnalisé
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label htmlFor="revenue" className="text-lg font-semibold">
                  Quel est votre chiffre d'affaires annuel ? (KTND)
                </Label>
                <Input
                  id="revenue"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.revenue || ''}
                  onChange={(e) => handleChange('revenue', parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 5000"
                  className="text-lg"
                />
                {formData.revenue > 10000 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                    <span className="text-sm text-blue-700 font-medium">
                      Profil Entreprise – Accompagnement personnalisé
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  KTND = Milliers de Dinars Tunisiens
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label htmlFor="sites" className="text-lg font-semibold">
                  Combien de sites gérez-vous ?
                </Label>
                <Input
                  id="sites"
                  type="number"
                  min="1"
                  value={formData.sites || ''}
                  onChange={(e) => handleChange('sites', parseInt(e.target.value) || 1)}
                  placeholder="Ex: 3"
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Ce nombre sera utilisé pour ajuster le prix si nécessaire.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 4: {
        const entityOptions = [1, 3, 6, 10];
        const entityPrice = calculateEntityPrice(formData.entities);
        const unitPrice = getEntityUnitPrice(formData.entities);
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <Label className="text-lg font-semibold">
                  Combien d'entités souhaitez-vous gérer ?
                </Label>
                <p className="text-sm text-muted-foreground">
                  Chaque entité correspond à une organisation ou filiale avec ses propres données et bilans. La 1ère entité est incluse.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {entityOptions.map((count) => {
                    const isSelected = formData.entities === count;
                    const price = calculateEntityPrice(count);
                    const perUnit = getEntityUnitPrice(count);
                    return (
                      <button
                        key={count}
                        onClick={() => handleChange('entities', count)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                        )}
                      >
                        <span className="text-2xl font-bold text-foreground">{count}</span>
                        <span className="text-xs text-muted-foreground">
                          {count === 1 ? 'entité' : 'entités'}
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {count === 1 ? 'Incluse' : `+${price.toLocaleString('fr-FR')} DT`}
                        </span>
                        {count > 1 && (
                          <span className="text-xs text-muted-foreground">
                            {perUnit.toLocaleString('fr-FR')} DT/entité
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {formData.entities > 1 && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{formData.entities} entités</span> : 1 incluse + {formData.entities - 1} supplémentaire{formData.entities > 2 ? 's' : ''} × {unitPrice.toLocaleString('fr-FR')} DT = <span className="font-bold text-primary">+{entityPrice.toLocaleString('fr-FR')} DT</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      }

      case 5:
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  Votre entreprise inclut-elle les émissions Scope 3 ?
                </Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope3"
                      checked={formData.hasScope3 === true}
                      onChange={() => handleChange('hasScope3', true)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope3"
                      checked={formData.hasScope3 === false}
                      onChange={() => handleChange('hasScope3', false)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span>Non</span>
                  </label>
                </div>
                {formData.hasScope3 && (
                  <p className="text-sm text-primary">
                    ✓ Un supplément de 900 DT sera ajouté pour le Scope 3.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label htmlFor="sector" className="text-lg font-semibold">
                  Dans quel secteur opérez-vous ?
                </Label>
                <Select
                  value={formData.sector || ''}
                  onValueChange={(value) => handleChange('sector', value)}
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Sélectionnez un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.value} value={sector.value}>
                        {sector.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case 7:
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  Quels modules souhaitez-vous ?
                </Label>
                <div className="space-y-3">
                  {defaultModules.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleModuleToggle(module.id)}
                    >
                      <Checkbox
                        checked={formData.selectedModules?.includes(module.id) || false}
                        onCheckedChange={() => handleModuleToggle(module.id)}
                      />
                      <div className="flex-1">
                        <Label className="font-medium cursor-pointer">
                          {module.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                        {module.id === 'academy' && (
                          <div className="mt-2">
                            <Input
                              type="number"
                              min="1"
                              value={formData.academyUsers || 1}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleChange('academyUsers', parseInt(e.target.value) || 1);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Nombre d'utilisateurs"
                              className="w-32"
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {module.id === 'academy' 
                            ? '600 DT/user' 
                            : `${module.price} DT`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return <div className="w-full">{renderStep()}</div>;
};

